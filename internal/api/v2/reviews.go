package api

import (
	"fmt"
	"net/http"
	"net/url"
	"path"
	"strings"
	"time"

	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/internal/email"
	"github.com/hashicorp-forge/hermes/internal/server"
	"github.com/hashicorp-forge/hermes/pkg/document"
	hcd "github.com/hashicorp-forge/hermes/pkg/hashicorpdocs"
	"github.com/hashicorp-forge/hermes/pkg/links"
	"github.com/hashicorp-forge/hermes/pkg/models"
	gw "github.com/hashicorp-forge/hermes/pkg/workspace/adapters/google"
	"github.com/hashicorp/go-multierror"
	"google.golang.org/api/drive/v3"
)

func ReviewsHandler(srv server.Server) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case "POST":
			// revertFuncs is a slice of functions to execute in the event of an error
			// that requires reverting previous logic.
			var revertFuncs []func() error

			// Validate request.
			docID, err := parseResourceIDFromURL(r.URL.Path, "reviews")
			if err != nil {
				srv.Logger.Error("error parsing document ID from reviews path",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
				)
				http.Error(w, "Document ID not found", http.StatusNotFound)
				return
			}

			// Check if document is locked.
			locked, err := hcd.IsLocked(docID, srv.DB, srv.GWService, srv.Logger)
			if err != nil {
				srv.Logger.Error("error checking document locked status",
					"error", err,
					"path", r.URL.Path,
					"method", r.Method,
					"doc_id", docID,
				)
				http.Error(w, "Error getting document status", http.StatusNotFound)
				return
			}
			// Don't continue if document is locked.
			if locked {
				http.Error(w, "Document is locked", http.StatusLocked)
				return
			}

			// Begin database transaction.
			tx := srv.DB.Begin()
			revertFuncs = append(revertFuncs, func() error {
				// Rollback database transaction.
				if err = tx.Rollback().Error; err != nil {
					return fmt.Errorf("error rolling back database transaction: %w", err)
				}

				return nil
			})

			// Get document from database.
			model := models.Document{
				GoogleFileID: docID,
			}
			if err := model.Get(tx); err != nil {
				srv.Logger.Error("error getting document from database",
					"error", err,
					"path", r.URL.Path,
					"method", r.Method,
					"doc_id", docID,
				)
				http.Error(w, "Error accessing document",
					http.StatusInternalServerError)
				return
			}

			// Get reviews for the document.
			var reviews models.DocumentReviews
			if err := reviews.Find(tx, models.DocumentReview{
				Document: models.Document{
					GoogleFileID: docID,
				},
			}); err != nil {
				srv.Logger.Error("error getting reviews for document",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID,
				)
				return
			}

			// Get group reviews for the document.
			var groupReviews models.DocumentGroupReviews
			if err := groupReviews.Find(srv.DB, models.DocumentGroupReview{
				Document: models.Document{
					GoogleFileID: docID,
				},
			}); err != nil {
				srv.Logger.Error("error getting group reviews for document",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID,
				)
				return
			}

			// Convert database model to a document.
			doc, err := document.NewFromDatabaseModel(
				model, reviews, groupReviews)
			if err != nil {
				srv.Logger.Error("error converting database model to document type",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID,
				)
				http.Error(w, "Error accessing document",
					http.StatusInternalServerError)
				return
			}

			// Validate document status.
			if doc.Status != "WIP" {
				srv.Logger.Warn("document is not in WIP status",
					"doc_id", docID,
					"method", r.Method,
					"path", r.URL.Path,
				)
				http.Error(w,
					"Cannot create review for a document that is not in WIP status",
					http.StatusUnprocessableEntity)
				return
			}

			// Get latest product number.
			latestNum, err := models.GetLatestProductNumber(
				tx, doc.DocType, doc.Product)
			if err != nil {
				srv.Logger.Error("error getting product document number",
					"error", err,
					"doc_id", docID,
					"method", r.Method,
					"path", r.URL.Path,
				)
				http.Error(w, "Error creating review",
					http.StatusInternalServerError)
				return
			}

			// Get product from database so we can get the product abbreviation.
			product := models.Product{
				Name: doc.Product,
			}
			if err := product.Get(tx); err != nil {
				srv.Logger.Error("error getting product",
					"error", err,
					"doc_id", docID,
					"method", r.Method,
					"path", r.URL.Path,
				)
				http.Error(w, "Error creating review",
					http.StatusInternalServerError)
				return
			}

			// Reset the document creation time to the current time of publish.
			now := time.Now()
			doc.Created = now.Format("Jan 2, 2006")
			doc.CreatedTime = now.Unix()

			// Set the document number.
			nextDocNum := latestNum + 1
			doc.DocNumber = fmt.Sprintf("%s-%03d",
				product.Abbreviation,
				nextDocNum)

			// Change document status to "In-Review".
			doc.Status = "In-Review"

			// Replace the doc header.
			err = doc.ReplaceHeader(srv.Config.BaseURL, false, srv.GWService)
			revertFuncs = append(revertFuncs, func() error {
				// Change back document number to "ABC-???" and status to "WIP".
				doc.DocNumber = fmt.Sprintf("%s-???", product.Abbreviation)
				doc.Status = "WIP"

				if err = doc.ReplaceHeader(
					srv.Config.BaseURL, false, srv.GWService,
				); err != nil {
					return fmt.Errorf("error replacing doc header: %w", err)
				}

				return nil
			})
			if err != nil {
				srv.Logger.Error("error replacing doc header",
					"error", err, "doc_id", docID)
				http.Error(w, "Error creating review",
					http.StatusInternalServerError)

				if err := revertReviewsPost(revertFuncs); err != nil {
					srv.Logger.Error("error reverting review creation",
						"error", err,
						"doc_id", docID,
						"method", r.Method,
						"path", r.URL.Path)
				}
				return
			}
			srv.Logger.Info("doc header replaced",
				"doc_id", docID,
				"method", r.Method,
				"path", r.URL.Path,
			)

			// Get file from Google Drive so we can get the latest modified time.
			file, err := srv.GWService.GetFile(docID)
			if err != nil {
				srv.Logger.Error("error getting document file from Google",
					"error", err,
					"path", r.URL.Path,
					"method", r.Method,
					"doc_id", docID,
				)
				http.Error(w, "Error creating review", http.StatusInternalServerError)
				if err := revertReviewsPost(revertFuncs); err != nil {
					srv.Logger.Error("error reverting review creation",
						"error", err,
						"doc_id", docID,
						"method", r.Method,
						"path", r.URL.Path)
				}
				return
			}

			// Parse and set modified time.
			modifiedTime, err := time.Parse(time.RFC3339Nano, file.ModifiedTime)
			if err != nil {
				srv.Logger.Error("error parsing modified time",
					"error", err,
					"path", r.URL.Path,
					"method", r.Method,
					"doc_id", docID,
				)
				http.Error(w, "Error creating review", http.StatusInternalServerError)
				if err := revertReviewsPost(revertFuncs); err != nil {
					srv.Logger.Error("error reverting review creation",
						"error", err,
						"doc_id", docID,
						"method", r.Method,
						"path", r.URL.Path)
				}
				return
			}
			doc.ModifiedTime = modifiedTime.Unix()

			// Get latest Google Drive file revision.
			latestRev, err := srv.GWService.GetLatestRevision(docID)
			if err != nil {
				srv.Logger.Error("error getting latest revision",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID)
				http.Error(w, "Error creating review",
					http.StatusInternalServerError)

				if err := revertReviewsPost(revertFuncs); err != nil {
					srv.Logger.Error("error reverting review creation",
						"error", err,
						"doc_id", docID,
						"method", r.Method,
						"path", r.URL.Path)
				}
				return
			}

			// Mark latest revision to be kept forever.
			_, err = srv.GWService.KeepRevisionForever(docID, latestRev.Id)
			revertFuncs = append(revertFuncs, func() error {
				// Mark latest revision to not be kept forever.
				if err = srv.GWService.UpdateKeepRevisionForever(
					docID, latestRev.Id, false,
				); err != nil {
					return fmt.Errorf(
						"error marking revision to not be kept forever: %w", err)
				}

				return nil
			})
			if err != nil {
				srv.Logger.Error("error marking revision to keep forever",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID,
					"rev_id", latestRev.Id)
				http.Error(w, "Error creating review",
					http.StatusInternalServerError)

				if err := revertReviewsPost(revertFuncs); err != nil {
					srv.Logger.Error("error reverting review creation",
						"error", err,
						"doc_id", docID,
						"method", r.Method,
						"path", r.URL.Path)
				}
				return
			}
			srv.Logger.Info("doc revision set to be kept forever",
				"doc_id", docID,
				"method", r.Method,
				"path", r.URL.Path,
			)

			// Record file revision in the Algolia document object.
			revisionName := "Requested review"
			doc.SetFileRevision(latestRev.Id, revisionName)

			// Create file revision in the database.
			fr := models.DocumentFileRevision{
				Document: models.Document{
					GoogleFileID: docID,
				},
				GoogleDriveFileRevisionID: latestRev.Id,
				Name:                      revisionName,
			}
			if err := fr.Create(tx); err != nil {
				srv.Logger.Error("error creating document file revision",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID,
					"rev_id", latestRev.Id)
				http.Error(w, "Error creating review",
					http.StatusInternalServerError)

				if err := revertReviewsPost(revertFuncs); err != nil {
					srv.Logger.Error("error reverting review creation",
						"error", err,
						"doc_id", docID,
						"method", r.Method,
						"path", r.URL.Path)
				}
				return
			}

			// Move document to published docs location in Google Drive.
			_, err = srv.GWService.MoveFile(
				docID, srv.Config.GoogleWorkspace.DocsFolder)
			revertFuncs = append(revertFuncs, func() error {
				// Move document back to drafts folder in Google Drive.
				if _, err := srv.GWService.MoveFile(
					doc.ObjectID, srv.Config.GoogleWorkspace.DraftsFolder); err != nil {

					return fmt.Errorf("error moving doc back to drafts folder: %w", err)

				}

				return nil
			})
			if err != nil {
				srv.Logger.Error("error moving file to docs folder",
					"error", err,
					"doc_id", docID,
					"method", r.Method,
					"path", r.URL.Path)
				http.Error(w, "Error creating review",
					http.StatusInternalServerError)

				if err := revertReviewsPost(revertFuncs); err != nil {
					srv.Logger.Error("error reverting review creation",
						"error", err,
						"doc_id", docID,
						"method", r.Method,
						"path", r.URL.Path)
				}
				return
			}
			srv.Logger.Info("doc moved to published document folder",
				"doc_id", docID,
				"method", r.Method,
				"path", r.URL.Path,
			)

			// Create shortcut in hierarchical folder structure.
			_, err = createShortcut(srv.Config, *doc, srv.GWService)
			if err != nil {
				srv.Logger.Error("error creating shortcut",
					"error", err,
					"doc_id", docID,
					"method", r.Method,
					"path", r.URL.Path)
				http.Error(w, "Error creating review",
					http.StatusInternalServerError)

				if err := revertReviewsPost(revertFuncs); err != nil {
					srv.Logger.Error("error reverting review creation",
						"error", err,
						"doc_id", docID,
						"method", r.Method,
						"path", r.URL.Path)
				}
				return
			}
			srv.Logger.Info("doc shortcut created",
				"doc_id", docID,
				"method", r.Method,
				"path", r.URL.Path,
			)

			// Create go-link.
			// TODO: use database for this instead of Algolia.
			err = links.SaveDocumentRedirectDetails(
				srv.AlgoWrite, docID, doc.DocType, doc.DocNumber)
			revertFuncs = append(revertFuncs, func() error {
				if err := links.DeleteDocumentRedirectDetails(
					srv.AlgoWrite, doc.ObjectID, doc.DocType, doc.DocNumber,
				); err != nil {
					return fmt.Errorf("error deleting go-link: %w", err)
				}

				return nil
			})
			if err != nil {
				srv.Logger.Error("error creating go-link",
					"error", err,
					"doc_id", docID,
					"method", r.Method,
					"path", r.URL.Path)
				http.Error(w, "Error creating review",
					http.StatusInternalServerError)
				if err := revertReviewsPost(revertFuncs); err != nil {
					srv.Logger.Error("error reverting review creation",
						"error", err,
						"doc_id", docID,
						"method", r.Method,
						"path", r.URL.Path)
				}
				return
			}
			srv.Logger.Info("doc redirect details saved",
				"doc_id", docID,
				"method", r.Method,
				"path", r.URL.Path,
			)

			// Update document in the database.
			d := models.Document{
				GoogleFileID: docID,
			}
			if err := d.Get(tx); err != nil {
				srv.Logger.Error("error getting document in database",
					"error", err,
					"doc_id", docID,
					"method", r.Method,
					"path", r.URL.Path)
				http.Error(w, "Error creating review",
					http.StatusInternalServerError)

				if err := revertReviewsPost(revertFuncs); err != nil {
					srv.Logger.Error("error reverting review creation",
						"error", err,
						"doc_id", docID,
						"method", r.Method,
						"path", r.URL.Path)
				}
				return
			}
			d.DocumentCreatedAt = now // Reset to document published time.
			d.Status = models.InReviewDocumentStatus
			d.DocumentNumber = nextDocNum
			d.DocumentModifiedAt = modifiedTime
			if err := d.Upsert(tx); err != nil {
				srv.Logger.Error("error upserting document in database",
					"error", err,
					"doc_id", docID,
					"method", r.Method,
					"path", r.URL.Path)
				http.Error(w, "Error creating review",
					http.StatusInternalServerError)

				if err := revertReviewsPost(revertFuncs); err != nil {
					srv.Logger.Error("error reverting review creation",
						"error", err,
						"doc_id", docID,
						"method", r.Method,
						"path", r.URL.Path)
				}
				return
			}

			// Create slice of all approvers consisting of individuals and groups.
			allApprovers := append(doc.Approvers, doc.ApproverGroups...)

			// Give document approvers and approver groups edit access to the
			// document.
			for _, a := range allApprovers {
				if err := srv.GWService.ShareFile(docID, a, "writer"); err != nil {
					srv.Logger.Error("error sharing file with approver",
						"error", err,
						"doc_id", docID,
						"method", r.Method,
						"path", r.URL.Path,
						"approver", a)
					http.Error(w, "Error creating review",
						http.StatusInternalServerError)

					if err := revertReviewsPost(revertFuncs); err != nil {
						srv.Logger.Error("error reverting review creation",
							"error", err,
							"doc_id", docID,
							"method", r.Method,
							"path", r.URL.Path)
					}
					return
				}
			}

			// Get document URL.
			docURL, err := getDocumentURL(srv.Config.BaseURL, docID)
			if err != nil {
				srv.Logger.Error("error getting document URL",
					"error", err,
					"doc_id", docID,
					"method", r.Method,
					"path", r.URL.Path,
				)
				http.Error(w, "Error creating review",
					http.StatusInternalServerError)
				if err := revertReviewsPost(revertFuncs); err != nil {
					srv.Logger.Error("error reverting review creation",
						"error", err,
						"doc_id", docID,
						"method", r.Method,
						"path", r.URL.Path)
				}
				return
			}

			// Send emails to approvers, if enabled.
			if srv.Config.Email != nil && srv.Config.Email.Enabled {
				if len(allApprovers) > 0 {
					// TODO: use an asynchronous method for sending emails because we
					// can't currently recover gracefully from a failure here.
					for _, approverEmail := range allApprovers {
						err := email.SendReviewRequestedEmail(
							email.ReviewRequestedEmailData{
								BaseURL:           srv.Config.BaseURL,
								DocumentOwner:     doc.Owners[0],
								DocumentShortName: doc.DocNumber,
								DocumentType:      doc.DocType,
								DocumentTitle:     doc.Title,
								DocumentStatus:    doc.Status,
								DocumentURL:       docURL,
								Product:           doc.Product,
							},
							[]string{approverEmail},
							srv.Config.Email.FromAddress,
							srv.GWService,
						)
						if err != nil {
							srv.Logger.Error("error sending approver email",
								"error", err,
								"doc_id", docID,
								"method", r.Method,
								"path", r.URL.Path,
							)
							http.Error(w, "Error creating review",
								http.StatusInternalServerError)
							if err := revertReviewsPost(revertFuncs); err != nil {
								srv.Logger.Error("error reverting review creation",
									"error", err,
									"doc_id", docID,
									"method", r.Method,
									"path", r.URL.Path)
							}
							return
						}
						srv.Logger.Info("doc approver email sent",
							"doc_id", docID,
							"method", r.Method,
							"path", r.URL.Path,
						)
					}
				}
			}

			// Commit the database transaction.
			if err := tx.Commit().Error; err != nil {
				srv.Logger.Error("error committing database transaction",
					"error", err,
					"doc_id", docID,
					"method", r.Method,
					"path", r.URL.Path,
				)
				http.Error(w, "Error creating review",
					http.StatusInternalServerError)

				if err := revertReviewsPost(revertFuncs); err != nil {
					srv.Logger.Error("error reverting review creation",
						"error", err,
						"doc_id", docID,
						"method", r.Method,
						"path", r.URL.Path)
				}
				return
			}

			// Write response.
			w.WriteHeader(http.StatusOK)

			// Log success.
			srv.Logger.Info("review created",
				"doc_id", docID,
				"method", r.Method,
				"path", r.URL.Path,
			)

			// Request post-processing.
			go func() {
				// Convert document to Algolia object.
				docObj, err := doc.ToAlgoliaObject(true)
				if err != nil {
					srv.Logger.Error("error converting document to Algolia object",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"doc_id", docID,
					)
					return
				}

				// Save document object in Algolia.
				res, err := srv.AlgoWrite.Docs.SaveObject(docObj)
				if err != nil {
					srv.Logger.Error("error saving document in Algolia",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"doc_id", docID,
					)
					return
				}
				err = res.Wait()
				if err != nil {
					srv.Logger.Error("error saving document in Algolia",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"doc_id", docID,
					)
					return
				}

				// Delete document object from drafts Algolia index.
				delRes, err := srv.AlgoWrite.Drafts.DeleteObject(docID)
				if err != nil {
					srv.Logger.Error("error deleting draft in Algolia",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"doc_id", docID,
					)
					return
				}
				err = delRes.Wait()
				if err != nil {
					srv.Logger.Error("error deleting draft in Algolia",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"doc_id", docID,
					)
					return
				}

				// Send emails to product subscribers, if enabled.
				if srv.Config.Email != nil && srv.Config.Email.Enabled {
					p := models.Product{
						Name: doc.Product,
					}
					if err := p.Get(srv.DB); err != nil {
						srv.Logger.Error("error getting product from database",
							"error", err,
							"doc_id", docID,
							"method", r.Method,
							"path", r.URL.Path,
						)
						return
					}

					if len(p.UserSubscribers) > 0 {
						// TODO: use an asynchronous method for sending emails because we
						// can't currently recover gracefully from a failure here.
						for _, subscriber := range p.UserSubscribers {
							err := email.SendSubscriberDocumentPublishedEmail(
								email.SubscriberDocumentPublishedEmailData{
									BaseURL:           srv.Config.BaseURL,
									DocumentOwner:     doc.Owners[0],
									DocumentShortName: doc.DocNumber,
									DocumentTitle:     doc.Title,
									DocumentType:      doc.DocType,
									DocumentURL:       docURL,
									Product:           doc.Product,
								},
								[]string{subscriber.EmailAddress},
								srv.Config.Email.FromAddress,
								srv.GWService,
							)
							if err != nil {
								srv.Logger.Error("error sending subscriber email",
									"error", err,
									"method", r.Method,
									"path", r.URL.Path,
									"doc_id", docID,
								)
							} else {
								srv.Logger.Info("doc subscriber email sent",
									"doc_id", docID,
									"method", r.Method,
									"path", r.URL.Path,
									"product", doc.Product,
								)
							}
						}
					}
				}

				// Compare Algolia and database documents to find data inconsistencies.
				// Get document object from Algolia.
				var algoDoc map[string]any
				err = srv.AlgoSearch.Docs.GetObject(docID, &algoDoc)
				if err != nil {
					srv.Logger.Error("error getting Algolia object for data comparison",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"doc_id", docID,
					)
					return
				}
				// Get document from database.
				dbDoc := models.Document{
					GoogleFileID: docID,
				}
				if err := dbDoc.Get(srv.DB); err != nil {
					srv.Logger.Error(
						"error getting document from database for data comparison",
						"error", err,
						"path", r.URL.Path,
						"method", r.Method,
						"doc_id", docID,
					)
					return
				}
				// Get all reviews for the document.
				var reviews models.DocumentReviews
				if err := reviews.Find(srv.DB, models.DocumentReview{
					Document: models.Document{
						GoogleFileID: docID,
					},
				}); err != nil {
					srv.Logger.Error(
						"error getting all reviews for document for data comparison",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"doc_id", docID,
					)
					return
				}
				if err := CompareAlgoliaAndDatabaseDocument(
					algoDoc, dbDoc, reviews, srv.Config.DocumentTypes.DocumentType,
				); err != nil {
					srv.Logger.Warn(
						"inconsistencies detected between Algolia and database docs",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"doc_id", docID,
					)
				}
			}()

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
	})
}

// createShortcut creates a shortcut in the hierarchical folder structure
// ("Shortcuts Folder/RFC/MyProduct/") under docsFolder.
func createShortcut(
	cfg *config.Config,
	doc document.Document,
	s *gw.Service) (shortcut *drive.File, retErr error) {

	// Get folder for doc type.
	docTypeFolder, err := s.GetSubfolder(
		cfg.GoogleWorkspace.ShortcutsFolder, doc.DocType)
	if err != nil {
		return nil, fmt.Errorf("error getting doc type subfolder: %w", err)
	}

	// Doc type folder wasn't found, so create it.
	if docTypeFolder == nil {
		docTypeFolder, err = s.CreateFolder(
			doc.DocType, cfg.GoogleWorkspace.ShortcutsFolder)
		if err != nil {
			return nil, fmt.Errorf("error creating doc type subfolder: %w", err)
		}
	}

	// Get folder for doc type + product.
	productFolder, err := s.GetSubfolder(docTypeFolder.Id, doc.Product)
	if err != nil {
		return nil, fmt.Errorf("error getting product subfolder: %w", err)
	}

	// Product folder wasn't found, so create it.
	if productFolder == nil {
		productFolder, err = s.CreateFolder(
			doc.Product, docTypeFolder.Id)
		if err != nil {
			return nil, fmt.Errorf("error creating product subfolder: %w", err)
		}
	}

	// Create shortcut.
	if shortcut, err = s.CreateShortcut(
		doc.ObjectID,
		productFolder.Id); err != nil {

		return nil, fmt.Errorf("error creating shortcut: %w", err)
	}

	return
}

// getDocumentURL returns a Hermes document URL.
func getDocumentURL(baseURL, docID string) (string, error) {
	docURL, err := url.Parse(baseURL)
	if err != nil {
		return "", fmt.Errorf("error parsing base URL: %w", err)
	}

	docURL.Path = path.Join(docURL.Path, "document", docID)
	docURLString := docURL.String()
	docURLString = strings.TrimRight(docURLString, "/")

	return docURLString, nil
}

// revertReviewsPost attempts to revert the actions that occur when a review is
// created. This is to be used in the case of an error during the review-
// creation process.
func revertReviewsPost(funcs []func() error) error {
	var result *multierror.Error

	for _, fn := range funcs {
		if err := fn(); err != nil {
			result = multierror.Append(result, err)
		}
	}

	return result.ErrorOrNil()
}
