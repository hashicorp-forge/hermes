package api

import (
	"encoding/json"
	pkgauth "github.com/hashicorp-forge/hermes/pkg/auth"
	"errors"
	"fmt"
	"net/http"
	"reflect"
	"regexp"
	"time"

	"github.com/algolia/algoliasearch-client-go/v3/algolia/errs"
	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/pkg/algolia"
	"github.com/hashicorp-forge/hermes/pkg/document"
	hcd "github.com/hashicorp-forge/hermes/pkg/hashicorpdocs"
	"github.com/hashicorp-forge/hermes/pkg/models"
	gw "github.com/hashicorp-forge/hermes/pkg/workspace/adapters/google"
	"github.com/hashicorp/go-hclog"
	"gorm.io/gorm"
)

// DocumentPatchRequest contains a subset of documents fields that are allowed
// to be updated with a PATCH request.
type DocumentPatchRequest struct {
	Approvers    *[]string               `json:"approvers,omitempty"`
	Contributors *[]string               `json:"contributors,omitempty"`
	CustomFields *[]document.CustomField `json:"customFields,omitempty"`
	Status       *string                 `json:"status,omitempty"`
	Summary      *string                 `json:"summary,omitempty"`
	// Tags                []string `json:"tags,omitempty"`
	Title *string `json:"title,omitempty"`
}

type documentSubcollectionRequestType int

const (
	unspecifiedDocumentSubcollectionRequestType documentSubcollectionRequestType = iota
	noSubcollectionRequestType
	relatedResourcesDocumentSubcollectionRequestType
	shareableDocumentSubcollectionRequestType
)

func DocumentHandler(
	cfg *config.Config,
	l hclog.Logger,
	ar *algolia.Client,
	aw *algolia.Client,
	s *gw.Service,
	db *gorm.DB) http.Handler {

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Parse document ID and request type from the URL path.
		docID, reqType, err := parseDocumentsURLPath(
			r.URL.Path, "documents")
		if err != nil {
			l.Error("error parsing documents URL path",
				"error", err,
				"path", r.URL.Path,
				"method", r.Method,
			)
			http.Error(w, "Bad request", http.StatusBadRequest)
			return
		}

		// Get document object from Algolia.
		var algoObj map[string]any
		err = ar.Docs.GetObject(docID, &algoObj)
		if err != nil {
			// Handle 404 from Algolia and only log a warning.
			if _, is404 := errs.IsAlgoliaErrWithCode(err, 404); is404 {
				l.Warn("document object not found in Algolia",
					"error", err,
					"path", r.URL.Path,
					"method", r.Method,
					"doc_id", docID,
				)
				http.Error(w, "Document not found", http.StatusNotFound)
				return
			} else {
				l.Error("error requesting document from Algolia",
					"error", err,
					"doc_id", docID,
				)
				http.Error(w, "Error accessing document",
					http.StatusInternalServerError)
				return
			}
		}

		// Convert Algolia object to a document.
		doc, err := document.NewFromAlgoliaObject(
			algoObj, cfg.DocumentTypes.DocumentType)
		if err != nil {
			l.Error("error converting Algolia object to document type",
				"error", err,
				"doc_id", docID,
			)
			http.Error(w, "Error accessing document",
				http.StatusInternalServerError)
			return
		}

		// Pass request off to associated subcollection (part of the URL after the
		// document ID) handler, if appropriate.
		switch reqType {
		case relatedResourcesDocumentSubcollectionRequestType:
			documentsResourceRelatedResourcesHandler(
				w, r, docID, *doc, cfg, l, ar, db)
			return
		case shareableDocumentSubcollectionRequestType:
			l.Warn("invalid shareable request for documents collection",
				"error", err,
				"path", r.URL.Path,
				"method", r.Method,
			)
			http.Error(w, "Bad request", http.StatusBadRequest)
			return
		}

		switch r.Method {
		case "GET":
			now := time.Now()

			// Get file from Google Drive so we can return the latest modified time.
			file, err := s.GetFile(docID)
			if err != nil {
				l.Error("error getting document file from Google",
					"error", err,
					"path", r.URL.Path,
					"method", r.Method,
					"doc_id", docID,
				)
				http.Error(w, "Error requesting document", http.StatusInternalServerError)
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
				http.Error(w, "Error requesting document", http.StatusInternalServerError)
				return
			}
			doc.ModifiedTime = modifiedTime.Unix()

			// Get document from database.
			model := models.Document{
				GoogleFileID: docID,
			}
			if err := model.Get(db); err != nil {
				l.Error("error getting document from database",
					"error", err,
					"path", r.URL.Path,
					"method", r.Method,
					"doc_id", docID,
				)
				http.Error(w, "Error requesting document",
					http.StatusInternalServerError)
				return
			}

			// Set locked value for response to value from the database (this value
			// isn't stored in Algolia).
			doc.Locked = model.Locked

			// Convert document to Algolia object because this is how it is expected
			// by the frontend.
			docObj, err := doc.ToAlgoliaObject(false)
			if err != nil {
				l.Error("error converting document to Algolia object",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID,
				)
				http.Error(w, "Error getting document",
					http.StatusInternalServerError)
				return
			}

			// Get projects associated with the document.
			projs, err := model.GetProjects(db)
			if err != nil {
				l.Error("error getting projects associated with document",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID,
				)
				http.Error(w, "Error processing request",
					http.StatusInternalServerError)
				return
			}
			projIDs := []int{}
			for _, p := range projs {
				projIDs = append(projIDs, int(p.ID))
			}
			docObj["projects"] = projIDs

			// Write response.
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)

			enc := json.NewEncoder(w)
			err = enc.Encode(docObj)
			if err != nil {
				l.Error("error encoding document",
					"error", err,
					"doc_id", docID,
				)
				http.Error(w, "Error requesting document",
					http.StatusInternalServerError)
				return
			}

			// Update recently viewed documents if this is a document view event. The
			// Add-To-Recently-Viewed header is set in the request from the frontend
			// to differentiate between document views and requests to only retrieve
			// document metadata.
			if r.Header.Get("Add-To-Recently-Viewed") != "" {
				// Get authenticated user's email address.
				email := pkgauth.MustGetUserEmail(r.Context())

				if err := updateRecentlyViewedDocs(email, docID, db, now); err != nil {
					// If we get an error, log it but don't return an error response
					// because this would degrade UX.
					l.Error("error updating recently viewed docs",
						"error", err,
						"doc_id", docID,
						"method", r.Method,
						"path", r.URL.Path,
					)
				}
			}

			l.Info("retrieved document",
				"doc_id", docID,
			)

			// Compare Algolia and database documents to find data inconsistencies.
			// Get document object from Algolia.
			var algoDoc map[string]any
			err = ar.Docs.GetObject(docID, &algoDoc)
			if err != nil {
				l.Error("error getting Algolia object for data comparison",
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
			if err := dbDoc.Get(db); err != nil {
				l.Error("error getting document from database for data comparison",
					"error", err,
					"path", r.URL.Path,
					"method", r.Method,
					"doc_id", docID,
				)
				return
			}
			// Get all reviews for the document.
			var reviews models.DocumentReviews
			if err := reviews.Find(db, models.DocumentReview{
				Document: models.Document{
					GoogleFileID: docID,
				},
			}); err != nil {
				l.Error("error getting all reviews for document for data comparison",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID,
				)
				return
			}
			if err := compareAlgoliaAndDatabaseDocument(
				algoDoc, dbDoc, reviews, cfg.DocumentTypes.DocumentType,
			); err != nil {
				l.Warn("inconsistencies detected between Algolia and database docs",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID,
				)
			}

		case "PATCH":
			// Authorize request (only the owner can PATCH the doc).
			userEmail := pkgauth.MustGetUserEmail(r.Context())
			if doc.Owners[0] != userEmail {
				http.Error(w, "Not a document owner", http.StatusUnauthorized)
				return
			}

			// Decode request. The request struct validates that the request only
			// contains fields that are allowed to be patched.
			var req DocumentPatchRequest
			if err := decodeRequest(r, &req); err != nil {
				l.Error("error decoding document patch request", "error", err)
				http.Error(w, fmt.Sprintf("Bad request: %q", err),
					http.StatusBadRequest)
				return
			}

			// Validate custom fields.
			if req.CustomFields != nil {
				for _, cf := range *req.CustomFields {
					cef, ok := doc.CustomEditableFields[cf.Name]
					if !ok {
						l.Error("custom field not found",
							"error", err,
							"method", r.Method,
							"path", r.URL.Path,
							"custom_field", cf.Name,
							"doc_id", docID)
						http.Error(w, "Bad request: invalid custom field",
							http.StatusBadRequest)
						return
					}
					if cf.DisplayName != cef.DisplayName {
						l.Error("invalid custom field display name",
							"error", err,
							"method", r.Method,
							"path", r.URL.Path,
							"custom_field", cf.Name,
							"custom_field_display_name", cf.DisplayName,
							"doc_id", docID)
						http.Error(w, "Bad request: invalid custom field display name",
							http.StatusBadRequest)
						return
					}
					if cf.Type != cef.Type {
						l.Error("invalid custom field type",
							"error", err,
							"method", r.Method,
							"path", r.URL.Path,
							"custom_field", cf.Name,
							"custom_field_type", cf.Type,
							"doc_id", docID)
						http.Error(w, "Bad request: invalid custom field type",
							http.StatusBadRequest)
						return
					}
				}
			}

			// Check if document is locked.
			provider := gw.NewAdapter(s)
			locked, err := hcd.IsLocked(docID, db, provider, l)
			if err != nil {
				l.Error("error checking document locked status",
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

			// Patch document (for Algolia).
			// Approvers.
			if req.Approvers != nil {
				doc.Approvers = *req.Approvers
			}
			// Contributors.
			if req.Contributors != nil {
				doc.Contributors = *req.Contributors
			}
			// Custom fields.
			if req.CustomFields != nil {
				for _, cf := range *req.CustomFields {
					switch cf.Type {
					case "STRING":
						if _, ok := cf.Value.(string); ok {
							if err := doc.UpsertCustomField(cf); err != nil {
								l.Error("error upserting custom string field",
									"error", err,
									"method", r.Method,
									"path", r.URL.Path,
									"custom_field", cf.Name,
									"doc_id", docID,
								)
								http.Error(w,
									"Error patching document",
									http.StatusInternalServerError)
								return
							}
						}
					case "PEOPLE":
						if reflect.TypeOf(cf.Value).Kind() != reflect.Slice {
							l.Error("invalid value type for people custom field",
								"error", err,
								"method", r.Method,
								"path", r.URL.Path,
								"custom_field", cf.Name,
								"doc_id", docID)
							http.Error(w,
								fmt.Sprintf(
									"Bad request: invalid value type for custom field %q",
									cf.Name,
								),
								http.StatusBadRequest)
							return
						}
						for _, v := range cf.Value.([]any) {
							if _, ok := v.(string); !ok {
								l.Error("invalid value type for people custom field",
									"error", err,
									"method", r.Method,
									"path", r.URL.Path,
									"custom_field", cf.Name,
									"doc_id", docID)
								http.Error(w,
									fmt.Sprintf(
										"Bad request: invalid value type for custom field %q",
										cf.Name,
									),
									http.StatusBadRequest)
								return
							}
						}
						if err := doc.UpsertCustomField(cf); err != nil {
							l.Error("error upserting custom people field",
								"error", err,
								"method", r.Method,
								"path", r.URL.Path,
								"custom_field", cf.Name,
								"doc_id", docID,
							)
							http.Error(w,
								"Error patching document",
								http.StatusInternalServerError)
							return
						}
					default:
						l.Error("invalid custom field type",
							"error", err,
							"method", r.Method,
							"path", r.URL.Path,
							"custom_field", cf.Name,
							"custom_field_type", cf.Type,
							"doc_id", docID)
						http.Error(w,
							fmt.Sprintf(
								"Bad request: invalid type for custom field %q",
								cf.Name,
							),
							http.StatusBadRequest)
						return
					}
				}
			}
			// Status.
			// TODO: validate status.
			if req.Status != nil {
				doc.Status = *req.Status
			}
			// Summary.
			if req.Summary != nil {
				doc.Summary = *req.Summary
			}
			// Title.
			if req.Title != nil {
				doc.Title = *req.Title
			}

			// Compare approvers in req and stored object in Algolia
			// before we save the patched objected
			var approversToEmail []string
			if len(doc.Approvers) == 0 && req.Approvers != nil && len(*req.Approvers) != 0 {
				// If there are no approvers of the document
				// email the approvers in the request
				approversToEmail = *req.Approvers
			} else if req.Approvers != nil && len(*req.Approvers) != 0 {
				// Only compare when there are stored approvers
				// and approvers in the request
				approversToEmail = compareSlices(doc.Approvers, *req.Approvers)
			}

			// Convert document to Algolia object.
			docObj, err := doc.ToAlgoliaObject(true)
			if err != nil {
				l.Error("error converting document to Algolia object",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID,
				)
				http.Error(w, "Error patching document",
					http.StatusInternalServerError)
				return
			}

			// Save new modified doc object in Algolia.
			res, err := aw.Docs.SaveObject(docObj)
			if err != nil {
				l.Error("error saving patched document in Algolia",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID)
				http.Error(w, "Error patching document",
					http.StatusInternalServerError)
				return
			}
			err = res.Wait()
			if err != nil {
				l.Error("error saving patched document in Algolia",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID)
				http.Error(w, "Error patching document",
					http.StatusInternalServerError)
				return
			}

			// Send emails to new approvers.
			if cfg.Email != nil && cfg.Email.Enabled {
				if len(approversToEmail) > 0 {
					// TODO: use a template for email content.
					rawBody := `
<html>
<body>
<p>Hi!</p>
<p>
Your review has been requested for a new document, <a href="%s">[%s] %s</a>.
</p>
<p>
Cheers,<br>
Hermes
</p>
</body>
</html>`

					docURL, err := getDocumentURL(cfg.BaseURL, docID)
					if err != nil {
						l.Error("error getting document URL",
							"error", err,
							"doc_id", docID,
							"method", r.Method,
							"path", r.URL.Path,
						)
						http.Error(w, "Error patching review",
							http.StatusInternalServerError)
						return
					}
					body := fmt.Sprintf(rawBody, docURL, doc.DocNumber, doc.Title)

					// TODO: use an asynchronous method for sending emails because we
					// can't currently recover gracefully on a failure here.
					for _, approverEmail := range approversToEmail {
						err = s.SendEmail(
							[]string{approverEmail},
							cfg.Email.FromAddress,
							fmt.Sprintf("Document review requested for %s", doc.DocNumber),
							body,
						)
						if err != nil {
							l.Error("error sending email",
								"error", err,
								"doc_id", docID,
								"method", r.Method,
								"path", r.URL.Path,
							)
							http.Error(w, "Error patching review",
								http.StatusInternalServerError)
							return
						}
					}
					l.Info("approver emails sent")
				}
			}

			// Replace the doc header.
			if err := doc.ReplaceHeader(cfg.BaseURL, false, provider); err != nil {
				l.Error("error replacing document header",
					"error", err, "doc_id", docID)
				http.Error(w, "Error patching document",
					http.StatusInternalServerError)
				return
			}

			// Rename file with new title.
			s.RenameFile(docID,
				fmt.Sprintf("[%s] %s", doc.DocNumber, doc.Title))

			// Get document record from database so we can modify it for updating.
			model := models.Document{
				GoogleFileID: docID,
			}
			if err := model.Get(db); err != nil {
				l.Error("error getting document from database",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID,
				)
				// Don't return an HTTP error because the database isn't the source of
				// truth yet.
			} else {
				// Approvers.
				if req.Approvers != nil {
					var approvers []*models.User
					for _, a := range doc.Approvers {
						u := models.User{
							EmailAddress: a,
						}
						approvers = append(approvers, &u)
					}
					model.Approvers = approvers
				}

				// Contributors.
				if req.Contributors != nil {
					var contributors []*models.User
					for _, a := range doc.Contributors {
						u := &models.User{
							EmailAddress: a,
						}
						contributors = append(contributors, u)
					}
					model.Contributors = contributors
				}

				// Custom fields.
				if req.CustomFields != nil {
					for _, cf := range *req.CustomFields {
						switch cf.Type {
						case "STRING":
							if v, ok := cf.Value.(string); ok {
								model.CustomFields = models.UpsertStringDocumentCustomField(
									model.CustomFields,
									doc.DocType,
									cf.DisplayName,
									v,
								)
							} else {
								l.Warn("invalid value type for string custom field",
									"error", err,
									"method", r.Method,
									"path", r.URL.Path,
									"custom_field", cf.Name,
									"doc_id", docID)
								// Don't return an HTTP error because the database isn't the
								// source of truth yet.
							}
						case "PEOPLE":
							if reflect.TypeOf(cf.Value).Kind() != reflect.Slice {
								l.Warn("invalid value type for people custom field",
									"error", err,
									"method", r.Method,
									"path", r.URL.Path,
									"custom_field", cf.Name,
									"doc_id", docID)
								// Don't return an HTTP error because the database isn't the
								// source of truth yet.
								break
							}
							cfVal := []string{}
							for _, v := range cf.Value.([]any) {
								if v, ok := v.(string); ok {
									cfVal = append(cfVal, v)
								} else {
									l.Warn("invalid value type for people custom field",
										"error", err,
										"method", r.Method,
										"path", r.URL.Path,
										"custom_field", cf.Name,
										"doc_id", docID)
									// Don't return an HTTP error because the database isn't the
									// source of truth yet.
								}
							}

							model.CustomFields, err = models.UpsertStringSliceDocumentCustomField(
								model.CustomFields,
								doc.DocType,
								cf.DisplayName,
								cfVal,
							)
							if err != nil {
								l.Warn("invalid value type for people custom field",
									"error", err,
									"method", r.Method,
									"path", r.URL.Path,
									"custom_field", cf.Name,
									"doc_id", docID)
								// Don't return an HTTP error because the database isn't the
								// source of truth yet.
							}
						default:
							l.Error("invalid custom field type",
								"error", err,
								"method", r.Method,
								"path", r.URL.Path,
								"custom_field", cf.Name,
								"custom_field_type", cf.Type,
								"doc_id", docID)
							http.Error(w,
								fmt.Sprintf(
									"Bad request: invalid type for custom field %q",
									cf.Name,
								),
								http.StatusBadRequest)
							return
						}
					}
				}
				// Make sure all custom fields have the document ID.
				for _, cf := range model.CustomFields {
					cf.DocumentID = model.ID
				}

				// Document modified time.
				model.DocumentModifiedAt = time.Unix(doc.ModifiedTime, 0)

				// Summary.
				if req.Summary != nil {
					model.Summary = req.Summary
				}

				// Title.
				if req.Title != nil {
					model.Title = *req.Title
				}

				// Update document in the database.
				if err := model.Upsert(db); err != nil {
					l.Error("error updating document",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"doc_id", docID,
					)
					// Don't return an HTTP error because the database isn't the source of
					// truth yet.
				}
			}

			w.WriteHeader(http.StatusOK)
			l.Info("patched document",
				"method", r.Method,
				"path", r.URL.Path,
				"doc_id", docID,
			)

			// Compare Algolia and database documents to find data inconsistencies.
			// Get document object from Algolia.
			var algoDoc map[string]any
			err = ar.Docs.GetObject(docID, &algoDoc)
			if err != nil {
				l.Error("error getting Algolia object for data comparison",
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
			if err := dbDoc.Get(db); err != nil {
				l.Error("error getting document from database for data comparison",
					"error", err,
					"path", r.URL.Path,
					"method", r.Method,
					"doc_id", docID,
				)
				return
			}
			// Get all reviews for the document.
			var reviews models.DocumentReviews
			if err := reviews.Find(db, models.DocumentReview{
				Document: models.Document{
					GoogleFileID: docID,
				},
			}); err != nil {
				l.Error("error getting all reviews for document for data comparison",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID,
				)
				return
			}
			if err := compareAlgoliaAndDatabaseDocument(
				algoDoc, dbDoc, reviews, cfg.DocumentTypes.DocumentType,
			); err != nil {
				l.Warn("inconsistencies detected between Algolia and database docs",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID,
				)
			}

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
	})
}

// updateRecentlyViewedDocs updates the recently viewed docs for a user with the
// provided email address, using the document file ID and viewed at time for a
// document view event.
func updateRecentlyViewedDocs(
	email, docID string, db *gorm.DB, viewedAt time.Time) error {
	// Get user (if exists).
	u := models.User{
		EmailAddress: email,
	}
	if err := u.Get(db); err != nil && !errors.Is(
		err, gorm.ErrRecordNotFound) {
		return fmt.Errorf("error getting user in database: %w", err)
	}

	// Get viewed document in database.
	doc := models.Document{
		GoogleFileID: docID,
	}
	if err := doc.Get(db); err != nil {
		return fmt.Errorf("error getting viewed document: %w", err)
	}

	// Find recently viewed documents.
	var rvd []models.RecentlyViewedDoc
	if err := db.Where(&models.RecentlyViewedDoc{UserID: int(u.ID)}).
		Order("viewed_at desc").
		Find(&rvd).Error; err != nil {
		return fmt.Errorf("error finding recently viewed docs for user: %w", err)
	}

	// Prepend viewed document to recently viewed documents.
	rvd = append(
		[]models.RecentlyViewedDoc{{
			DocumentID: int(doc.ID),
			UserID:     int(u.ID),
		}},
		rvd...)

	// Get document records for recently viewed docs.
	docs := []models.Document{}
	for _, d := range rvd {
		dd := models.Document{
			Model: gorm.Model{
				ID: uint(d.DocumentID),
			},
		}
		if err := dd.Get(db); err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				continue
			}
			return fmt.Errorf("error getting document: %w", err)
		}
		docs = append(docs, dd)
	}

	// Trim recently viewed documents to a length of 10.
	if len(docs) > 10 {
		docs = docs[:10]
	}

	// Update user.
	u.RecentlyViewedDocs = docs
	if err := u.Upsert(db); err != nil {
		return fmt.Errorf("error upserting user: %w", err)
	}

	// Update ViewedAt time for this document.
	viewedDoc := models.RecentlyViewedDoc{
		UserID:     int(u.ID),
		DocumentID: int(doc.ID),
		ViewedAt:   viewedAt,
	}
	if err := db.Updates(&viewedDoc).Error; err != nil {
		return fmt.Errorf(
			"error updating recently viewed document in database: %w", err)
	}

	return nil
}

// parseDocumentsURLPath parses the document ID and subcollection request type
// from a documents/drafts API URL path.
func parseDocumentsURLPath(path, collection string) (
	docID string,
	reqType documentSubcollectionRequestType,
	err error,
) {
	noSubcollectionRE := regexp.MustCompile(
		fmt.Sprintf(
			`^\/api\/v1\/%s\/([0-9A-Za-z_\-]+)$`,
			collection))
	relatedResourcesSubcollectionRE := regexp.MustCompile(
		fmt.Sprintf(
			`^\/api\/v1\/%s\/([0-9A-Za-z_\-]+)\/related-resources$`,
			collection))
	// shareable isn't really a subcollection, but we'll go with it.
	shareableRE := regexp.MustCompile(
		fmt.Sprintf(
			`^\/api\/v1\/%s\/([0-9A-Za-z_\-]+)\/shareable$`,
			collection))

	switch {
	case noSubcollectionRE.MatchString(path):
		matches := noSubcollectionRE.FindStringSubmatch(path)
		if len(matches) != 2 {
			return "", unspecifiedDocumentSubcollectionRequestType, fmt.Errorf(
				"wrong number of string submatches for resource URL path")
		}
		return matches[1], noSubcollectionRequestType, nil

	case relatedResourcesSubcollectionRE.MatchString(path):
		matches := relatedResourcesSubcollectionRE.
			FindStringSubmatch(path)
		if len(matches) != 2 {
			return "",
				relatedResourcesDocumentSubcollectionRequestType,
				fmt.Errorf(
					"wrong number of string submatches for related resources subcollection URL path")
		}
		return matches[1], relatedResourcesDocumentSubcollectionRequestType, nil

	case shareableRE.MatchString(path):
		matches := shareableRE.
			FindStringSubmatch(path)
		if len(matches) != 2 {
			return "",
				shareableDocumentSubcollectionRequestType,
				fmt.Errorf(
					"wrong number of string submatches for shareable subcollection URL path")
		}
		return matches[1], shareableDocumentSubcollectionRequestType, nil

	default:
		return "",
			unspecifiedDocumentSubcollectionRequestType,
			fmt.Errorf("path did not match any URL strings")
	}
}
