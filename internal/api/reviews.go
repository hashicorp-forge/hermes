package api

import (
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"path"
	"strings"
	"time"

	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/internal/email"
	"github.com/hashicorp-forge/hermes/pkg/algolia"
	gw "github.com/hashicorp-forge/hermes/pkg/googleworkspace"
	hcd "github.com/hashicorp-forge/hermes/pkg/hashicorpdocs"
	"github.com/hashicorp-forge/hermes/pkg/links"
	"github.com/hashicorp-forge/hermes/pkg/models"
	"github.com/hashicorp/go-hclog"
	"github.com/hashicorp/go-multierror"
	"google.golang.org/api/drive/v3"
	"gorm.io/gorm"
)

func ReviewHandler(
	cfg *config.Config,
	l hclog.Logger,
	ar *algolia.Client,
	aw *algolia.Client,
	s *gw.Service,
	db *gorm.DB,
) http.Handler {

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case "POST":
			// Validate request.
			docID, err := parseResourceIDFromURL(r.URL.Path, "reviews")
			if err != nil {
				l.Error("error parsing document ID from reviews path",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
				)
				http.Error(w, "Document ID not found", http.StatusNotFound)
				return
			}

			// Get base document object from Algolia so we can determine the doc type.
			baseDocObj := &hcd.BaseDoc{}
			err = ar.Drafts.GetObject(docID, &baseDocObj)
			if err != nil {
				l.Error("error requesting base document object from Algolia",
					"error", err,
					"path", r.URL.Path,
					"method", r.Method,
					"doc_id", docID,
				)
				http.Error(w, "Error creating review",
					http.StatusInternalServerError)
				return
			}

			// Create new document object of the proper doc type.
			docObj, err := hcd.NewEmptyDoc(baseDocObj.DocType)
			if err != nil {
				l.Error("error creating new empty doc",
					"error", err,
					"path", r.URL.Path,
					"method", r.Method,
					"doc_id", docID,
				)
				http.Error(w, "Error creating review",
					http.StatusInternalServerError)
				return
			}

			// Get document object from Algolia.
			err = ar.Drafts.GetObject(docID, &docObj)
			if err != nil {
				l.Error("error getting document from Algolia",
					"error", err,
					"doc_id", docID,
					"method", r.Method,
					"path", r.URL.Path,
				)
				http.Error(w, "Error creating review",
					http.StatusInternalServerError)
				return
			}
			l.Info("retrieved document draft",
				"doc_id", docID,
				"method", r.Method,
				"path", r.URL.Path,
			)

			// Get latest product number.
			latestNum, err := models.GetLatestProductNumber(
				db, docObj.GetDocType(), docObj.GetProduct())
			if err != nil {
				l.Error("error getting product document number",
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
				Name: docObj.GetProduct(),
			}
			if err := product.Get(db); err != nil {
				l.Error("error getting product",
					"error", err,
					"doc_id", docID,
					"method", r.Method,
					"path", r.URL.Path,
				)
				http.Error(w, "Error creating review",
					http.StatusInternalServerError)
				return
			}

			// Set the document number.
			nextDocNum := latestNum + 1
			docObj.SetDocNumber(fmt.Sprintf("%s-%03d",
				product.Abbreviation,
				nextDocNum))

			// Change document status to "In-Review".
			docObj.SetStatus("In-Review")

			// Replace the doc header.
			err = docObj.ReplaceHeader(
				docID, cfg.BaseURL, true, s)
			if err != nil {
				l.Error("error replacing doc header",
					"error", err, "doc_id", docID)
				http.Error(w, "Error creating review",
					http.StatusInternalServerError)

				if err := revertReviewCreation(
					docObj, product.Abbreviation, "", nil, cfg, aw, s,
				); err != nil {
					l.Error("error reverting review creation",
						"error", err,
						"doc_id", docID,
						"method", r.Method,
						"path", r.URL.Path)
				}
				return
			}
			// Log replacing doc header
			l.Info("doc header replaced",
				"doc_id", docID,
				"method", r.Method,
				"path", r.URL.Path,
			)

			// Get file from Google Drive so we can get the latest modified time.
			file, err := s.GetFile(docID)
			if err != nil {
				l.Error("error getting document file from Google",
					"error", err,
					"path", r.URL.Path,
					"method", r.Method,
					"doc_id", docID,
				)
				http.Error(w, `{"error": "Error creating review"}`,
					http.StatusInternalServerError)
				return
			}

			// Parse and set modified time.
			modifiedTime, err := time.Parse(time.RFC3339Nano, file.ModifiedTime)
			if err != nil {
				l.Error("error parsing modified time",
					"error", err,
					"path", r.URL.Path,
					"method", r.Method,
					"doc_id", docID,
				)
				http.Error(w, `{"error": "Error creating review"}`,
					http.StatusInternalServerError)
				return
			}
			docObj.SetModifiedTime(modifiedTime.Unix())

			// Get latest Google Drive file revision.
			latestRev, err := s.GetLatestRevision(docID)
			if err != nil {
				l.Error("error getting latest revision",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID)
				http.Error(w, "Error creating review",
					http.StatusInternalServerError)

				if err := revertReviewCreation(
					docObj, product.Abbreviation, "", nil, cfg, aw, s,
				); err != nil {
					l.Error("error reverting review creation",
						"error", err,
						"doc_id", docID,
						"method", r.Method,
						"path", r.URL.Path)
				}
				return
			}

			// Mark latest revision to be kept forever.
			_, err = s.KeepRevisionForever(docID, latestRev.Id)
			if err != nil {
				l.Error("error marking revision to keep forever",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID,
					"rev_id", latestRev.Id)
				http.Error(w, "Error creating review",
					http.StatusInternalServerError)

				if err := revertReviewCreation(
					docObj, product.Abbreviation, "", nil, cfg, aw, s,
				); err != nil {
					l.Error("error reverting review creation",
						"error", err,
						"doc_id", docID,
						"method", r.Method,
						"path", r.URL.Path)
				}
				return
			}
			// Log replacing doc header
			l.Info("doc revision set to be kept forever",
				"doc_id", docID,
				"method", r.Method,
				"path", r.URL.Path,
			)

			// Record file revision in the Algolia document object.
			revisionName := "Requested review"
			docObj.SetFileRevision(latestRev.Id, revisionName)

			// Move document object to docs index in Algolia.
			saveRes, err := aw.Docs.SaveObject(docObj)
			if err != nil {
				l.Error("error saving doc in Algolia", "error", err, "doc_id", docID)
				http.Error(w, "Error creating review",
					http.StatusInternalServerError)
				return
			}
			err = saveRes.Wait()
			if err != nil {
				l.Error("error saving doc in Algolia", "error", err, "doc_id", docID)
				http.Error(w, "Error creating review",
					http.StatusInternalServerError)
				return
			}
			l.Info("doc saved in Algolia",
				"doc_id", docID,
				"method", r.Method,
				"path", r.URL.Path,
			)
			delRes, err := aw.Drafts.DeleteObject(docID)
			if err != nil {
				l.Error("error deleting draft in Algolia",
					"error", err, "doc_id", docID)
				http.Error(w, "Error creating review",
					http.StatusInternalServerError)

				if err := revertReviewCreation(
					docObj, product.Abbreviation, latestRev.Id, nil, cfg, aw, s,
				); err != nil {
					l.Error("error reverting review creation",
						"error", err,
						"doc_id", docID,
						"method", r.Method,
						"path", r.URL.Path)
				}
				return
			}
			err = delRes.Wait()
			if err != nil {
				l.Error("error deleting draft in Algolia",
					"error", err, "doc_id", docID)
				http.Error(w, "Error creating review",
					http.StatusInternalServerError)

				if err := revertReviewCreation(
					docObj, product.Abbreviation, latestRev.Id, nil, cfg, aw, s,
				); err != nil {
					l.Error("error reverting review creation",
						"error", err,
						"doc_id", docID,
						"method", r.Method,
						"path", r.URL.Path)
				}
				return
			}

			// Move document to published docs location in Google Drive.
			if _, err := s.MoveFile(
				docID, cfg.GoogleWorkspace.DocsFolder); err != nil {
				l.Error("error moving file",
					"error", err,
					"doc_id", docID,
					"method", r.Method,
					"path", r.URL.Path)
				http.Error(w, "Error creating review",
					http.StatusInternalServerError)

				if err := revertReviewCreation(
					docObj, product.Abbreviation, latestRev.Id, nil, cfg, aw, s,
				); err != nil {
					l.Error("error reverting review creation",
						"error", err,
						"doc_id", docID,
						"method", r.Method,
						"path", r.URL.Path)
				}
				return
			}
			l.Info("doc moved to published document folder",
				"doc_id", docID,
				"method", r.Method,
				"path", r.URL.Path,
			)

			// Create shortcut in hierarchical folder structure.
			shortcut, err := createShortcut(cfg, docObj, s)
			if err != nil {
				l.Error("error creating shortcut",
					"error", err,
					"doc_id", docID,
					"method", r.Method,
					"path", r.URL.Path)
				http.Error(w, "Error creating review",
					http.StatusInternalServerError)

				if err := revertReviewCreation(
					docObj, product.Abbreviation, latestRev.Id, shortcut, cfg, aw, s,
				); err != nil {
					l.Error("error reverting review creation",
						"error", err,
						"doc_id", docID,
						"method", r.Method,
						"path", r.URL.Path)
				}
				return
			}
			l.Info("doc shortcut created",
				"doc_id", docID,
				"method", r.Method,
				"path", r.URL.Path,
			)

			// Create go-link.
			if err := links.SaveDocumentRedirectDetails(
				aw, docID, docObj.GetDocType(), docObj.GetDocNumber()); err != nil {
				l.Error("error saving redirect details",
					"error", err,
					"doc_id", docID,
					"method", r.Method,
					"path", r.URL.Path)
				http.Error(w, "Error creating review",
					http.StatusInternalServerError)

				if err := revertReviewCreation(
					docObj, product.Abbreviation, latestRev.Id, shortcut, cfg, aw, s,
				); err != nil {
					l.Error("error reverting review creation",
						"error", err,
						"doc_id", docID,
						"method", r.Method,
						"path", r.URL.Path)
				}
				return
			}
			l.Info("doc redirect details saved",
				"doc_id", docID,
				"method", r.Method,
				"path", r.URL.Path,
			)

			// Update document in the database.
			d := models.Document{
				GoogleFileID: docID,
			}
			if err := d.Get(db); err != nil {
				l.Error("error getting document in database",
					"error", err,
					"doc_id", docID,
					"method", r.Method,
					"path", r.URL.Path)
				http.Error(w, "Error creating review",
					http.StatusInternalServerError)

				if err := revertReviewCreation(
					docObj, product.Abbreviation, latestRev.Id, shortcut, cfg, aw, s,
				); err != nil {
					l.Error("error reverting review creation",
						"error", err,
						"doc_id", docID,
						"method", r.Method,
						"path", r.URL.Path)
				}
				return
			}
			d.Status = models.InReviewDocumentStatus
			d.DocumentNumber = nextDocNum
			if err := d.Upsert(db); err != nil {
				l.Error("error upserting document in database",
					"error", err,
					"doc_id", docID,
					"method", r.Method,
					"path", r.URL.Path)
				http.Error(w, "Error creating review",
					http.StatusInternalServerError)

				if err := revertReviewCreation(
					docObj, product.Abbreviation, latestRev.Id, shortcut, cfg, aw, s,
				); err != nil {
					l.Error("error reverting review creation",
						"error", err,
						"doc_id", docID,
						"method", r.Method,
						"path", r.URL.Path)
				}
				return
			}

			// Send emails, if enabled.
			if cfg.Email != nil && cfg.Email.Enabled {
				docURL, err := getDocumentURL(cfg.BaseURL, docID)
				if err != nil {
					l.Error("error getting document URL",
						"error", err,
						"doc_id", docID,
						"method", r.Method,
						"path", r.URL.Path,
					)
					http.Error(w, "Error creating review",
						http.StatusInternalServerError)
					return
				}

				// Send emails to approvers.
				if len(docObj.GetApprovers()) > 0 {
					// TODO: use an asynchronous method for sending emails because we
					// can't currently recover gracefully from a failure here.
					for _, approverEmail := range docObj.GetApprovers() {
						err := email.SendReviewRequestedEmail(
							email.ReviewRequestedEmailData{
								BaseURL:           cfg.BaseURL,
								DocumentOwner:     docObj.GetOwners()[0],
								DocumentShortName: docObj.GetDocNumber(),
								DocumentTitle:     docObj.GetTitle(),
								DocumentURL:       docURL,
							},
							[]string{approverEmail},
							cfg.Email.FromAddress,
							s,
						)
						if err != nil {
							l.Error("error sending approver email",
								"error", err,
								"doc_id", docID,
								"method", r.Method,
								"path", r.URL.Path,
							)
							http.Error(w, "Error creating review",
								http.StatusInternalServerError)
							return
						}
						l.Info("doc approver email sent",
							"doc_id", docID,
							"method", r.Method,
							"path", r.URL.Path,
						)
					}
				}

				// Send emails to product subscribers.
				p := models.Product{
					Name: docObj.GetProduct(),
				}
				if err := p.Get(db); err != nil {
					l.Error("error getting product from database",
						"error", err,
						"doc_id", docID,
						"method", r.Method,
						"path", r.URL.Path,
					)
					http.Error(w, `{"error": "Error sending subscriber email"}`,
						http.StatusInternalServerError)
					return
				}

				if len(p.UserSubscribers) > 0 {
					// TODO: use an asynchronous method for sending emails because we
					// can't currently recover gracefully from a failure here.
					for _, subscriber := range p.UserSubscribers {
						err := email.SendSubscriberDocumentPublishedEmail(
							email.SubscriberDocumentPublishedEmailData{
								BaseURL:           cfg.BaseURL,
								DocumentOwner:     docObj.GetOwners()[0],
								DocumentShortName: docObj.GetDocNumber(),
								DocumentTitle:     docObj.GetTitle(),
								DocumentURL:       docURL,
								Product:           docObj.GetProduct(),
							},
							[]string{subscriber.EmailAddress},
							cfg.Email.FromAddress,
							s,
						)
						if err != nil {
							l.Error("error sending subscriber email",
								"error", err,
								"doc_id", docID,
								"method", r.Method,
								"path", r.URL.Path,
							)
							http.Error(w, `{"error": "Error sending subscriber email"}`,
								http.StatusInternalServerError)
							return
						}
						l.Info("doc subscriber email sent",
							"doc_id", docID,
							"method", r.Method,
							"path", r.URL.Path,
						)
					}
				}
			}

			// Write response.
			w.WriteHeader(http.StatusOK)

			// Log success.
			l.Info("review created",
				"doc_id", docID,
				"method", r.Method,
				"path", r.URL.Path,
			)

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
	docObj hcd.Doc,
	s *gw.Service) (shortcut *drive.File, retErr error) {

	// Get folder for doc type.
	docTypeFolder, err := s.GetSubfolder(
		cfg.GoogleWorkspace.ShortcutsFolder, docObj.GetDocType())
	if err != nil {
		return nil, fmt.Errorf("error getting doc type subfolder: %w", err)
	}

	// Doc type folder wasn't found, so create it.
	if docTypeFolder == nil {
		docTypeFolder, err = s.CreateFolder(
			docObj.GetDocType(), cfg.GoogleWorkspace.ShortcutsFolder)
		if err != nil {
			return nil, fmt.Errorf("error creating doc type subfolder: %w", err)
		}
	}

	// Get folder for doc type + product.
	productFolder, err := s.GetSubfolder(docTypeFolder.Id, docObj.GetProduct())
	if err != nil {
		return nil, fmt.Errorf("error getting product subfolder: %w", err)
	}

	// Product folder wasn't found, so create it.
	if productFolder == nil {
		productFolder, err = s.CreateFolder(
			docObj.GetProduct(), docTypeFolder.Id)
		if err != nil {
			return nil, fmt.Errorf("error creating product subfolder: %w", err)
		}
	}

	// Create shortcut.
	if shortcut, err = s.CreateShortcut(
		docObj.GetObjectID(),
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

// revertReviewCreation attempts to revert the actions that occur when a review
// is created. This is to be used in the case of an error during the review-
// creation process.
// TODO: use some sort of undo stack of functions instead of checking if the
// arguments for this function are set.
func revertReviewCreation(
	docObj hcd.Doc,
	productAbbreviation string,
	fileRevision string,
	shortcut *drive.File,
	cfg *config.Config,
	a *algolia.Client,
	s *gw.Service) error {

	// Use go-multierror so we can return all cleanup errors.
	var result error

	// Delete go-link if it exists.
	if err := links.DeleteDocumentRedirectDetails(
		a, docObj.GetObjectID(), docObj.GetDocType(), docObj.GetDocNumber(),
	); err != nil {
		result = multierror.Append(
			result, fmt.Errorf("error deleting go-link: %w", err))
	}

	// Delete shortcut if it exists.
	if shortcut != nil {
		if err := s.DeleteFile(shortcut.Id); err != nil {
			result = multierror.Append(
				result, fmt.Errorf("error deleting shortcut: %w", err))
		}
	}

	// Move document back to drafts folder in Google Drive.
	if _, err := s.MoveFile(
		docObj.GetObjectID(), cfg.GoogleWorkspace.DraftsFolder); err != nil {

		result = multierror.Append(
			result, fmt.Errorf("error moving doc back to drafts folder: %w", err))
	}

	// Change back document number to "ABC-???" and status to "WIP".
	docObj.SetDocNumber(fmt.Sprintf("%s-???", productAbbreviation))
	docObj.SetStatus("WIP")

	// Replace the doc header.
	if err := docObj.ReplaceHeader(
		docObj.GetObjectID(), cfg.BaseURL, true, s); err != nil {

		result = multierror.Append(
			result, fmt.Errorf("error replacing the doc header: %w", err))
	}

	// Delete file revision from Algolia document object.
	if fileRevision != "" {
		docObj.DeleteFileRevision(fileRevision)
	}

	// Save doc back in the drafts index and delete it from the docs index.
	saveRes, err := a.Drafts.SaveObject(docObj)
	if err != nil {
		result = multierror.Append(
			result, fmt.Errorf("error saving draft in Algolia: %w", err))
	}
	err = saveRes.Wait()
	if err != nil {
		result = multierror.Append(
			result, fmt.Errorf("error saving draft in Algolia: %w", err))
	}
	delRes, err := a.Docs.DeleteObject(docObj.GetObjectID())
	if err != nil {
		result = multierror.Append(
			result, fmt.Errorf("error deleting doc in Algolia: %w", err))
	}
	err = delRes.Wait()
	if err != nil {
		result = multierror.Append(
			result, fmt.Errorf("error deleting doc in Algolia: %w", err))
	}

	return result
}

// setLatestProductDocumentNumberinDB sets the latest product document number in
// the database.
func setLatestProductDocumentNumberinDB(
	doc hcd.Doc,
	db *gorm.DB,
	log hclog.Logger,
) error {
	return db.Transaction(func(tx *gorm.DB) error {
		// Get the latest product document number.
		p := models.ProductLatestDocumentNumber{
			DocumentType: models.DocumentType{
				Name: doc.GetDocType(),
			},
			Product: models.Product{
				Name: doc.GetProduct(),
			},
		}
		if err := p.Get(tx); err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				// Latest product document number record doesn't exist so we need to
				// create it (with latest document number of 1).
				p = models.ProductLatestDocumentNumber{
					DocumentType: models.DocumentType{
						Name: doc.GetDocType(),
					},
					Product: models.Product{
						Name: doc.GetProduct(),
					},
					LatestDocumentNumber: 1,
				}
				if err := p.Upsert(tx); err != nil {
					return fmt.Errorf(
						"error upserting latest product document number: %w", err)
				}

				return nil
			} else {
				return fmt.Errorf(
					"error getting latest product document number: %w", err)
			}
		}

		p.LatestDocumentNumber = p.LatestDocumentNumber + 1
		if err := p.Upsert(tx); err != nil {
			return fmt.Errorf(
				"error upserting latest product document number: %w", err)
		}

		return nil
	})
}
