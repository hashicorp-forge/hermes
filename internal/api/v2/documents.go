package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"reflect"
	"regexp"
	"time"

	"github.com/hashicorp-forge/hermes/internal/email"
	"github.com/hashicorp-forge/hermes/internal/helpers"
	"github.com/hashicorp-forge/hermes/internal/server"
	pkgauth "github.com/hashicorp-forge/hermes/pkg/auth"
	"github.com/hashicorp-forge/hermes/pkg/document"
	hcd "github.com/hashicorp-forge/hermes/pkg/hashicorpdocs"
	"github.com/hashicorp-forge/hermes/pkg/models"
	"gorm.io/gorm"
)

// DocumentPatchRequest contains a subset of documents fields that are allowed
// to be updated with a PATCH request.
type DocumentPatchRequest struct {
	Approvers      *[]string               `json:"approvers,omitempty"`
	ApproverGroups *[]string               `json:"approverGroups,omitempty"`
	Contributors   *[]string               `json:"contributors,omitempty"`
	CustomFields   *[]document.CustomField `json:"customFields,omitempty"`
	Owners         *[]string               `json:"owners,omitempty"`
	Status         *string                 `json:"status,omitempty"`
	Summary        *string                 `json:"summary,omitempty"`
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

func DocumentHandler(srv server.Server) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Parse document ID and request type from the URL path.
		docID, reqType, err := parseDocumentsURLPath(
			r.URL.Path, "documents")
		if err != nil {
			srv.Logger.Error("error parsing documents URL path",
				"error", err,
				"path", r.URL.Path,
				"method", r.Method,
			)
			http.Error(w, "Bad request", http.StatusBadRequest)
			return
		}

		// Get document from database.
		model := models.Document{
			GoogleFileID: docID,
		}
		if err := model.Get(srv.DB); err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				srv.Logger.Warn("document record not found",
					"path", r.URL.Path,
					"method", r.Method,
					"doc_id", docID,
				)
				http.Error(w, "Document not found", http.StatusNotFound)
				return
			} else {
				srv.Logger.Error("error getting document from database",
					"error", err,
					"path", r.URL.Path,
					"method", r.Method,
					"doc_id", docID,
				)
				http.Error(w, "Error requesting document",
					http.StatusInternalServerError)
				return
			}
		}

		// Get reviews for the document.
		var reviews models.DocumentReviews
		if err := reviews.Find(srv.DB, models.DocumentReview{
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
			http.Error(w, "Error processing request", http.StatusInternalServerError)
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
			http.Error(w, "Error processing request", http.StatusInternalServerError)
			return
		}

		// If the document was created through Hermes and has a status of "WIP", it
		// is a document draft and should be instead accessed through the drafts
		// API. We return a 404 to be consistent with v1 of the API, and will
		// improve this UX in the future when these APIs are combined.
		if doc.AppCreated && doc.Status == "WIP" {
			srv.Logger.Warn("attempted to access document draft via documents API",
				"method", r.Method,
				"path", r.URL.Path,
				"doc_id", docID,
			)
			http.Error(w, "Document not found", http.StatusNotFound)
			return
		}

		// Pass request off to associated subcollection (part of the URL after the
		// document ID) handler, if appropriate.
		switch reqType {
		case relatedResourcesDocumentSubcollectionRequestType:
			documentsResourceRelatedResourcesHandler(
				w, r, docID, *doc, srv.Config, srv.Logger, srv.AlgoSearch, srv.DB)
			return
		case shareableDocumentSubcollectionRequestType:
			srv.Logger.Warn("invalid shareable request for documents collection",
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
			file, err := srv.GWService.GetFile(docID)
			if err != nil {
				srv.Logger.Error("error getting document file from Google",
					"error", err,
					"path", r.URL.Path,
					"method", r.Method,
					"doc_id", docID,
				)
				http.Error(w,
					"Error requesting document", http.StatusInternalServerError)
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
				http.Error(w,
					"Error requesting document", http.StatusInternalServerError)
				return
			}
			doc.ModifiedTime = modifiedTime.Unix()

			// Convert document to Algolia object because this is how it is expected
			// by the frontend.
			docObj, err := doc.ToAlgoliaObject(false)
			if err != nil {
				srv.Logger.Error("error converting document to Algolia object",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID,
				)
				http.Error(w, "Error processing request",
					http.StatusInternalServerError)
				return
			}

			// Get projects associated with the document.
			projs, err := model.GetProjects(srv.DB)
			if err != nil {
				srv.Logger.Error("error getting projects associated with document",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID,
				)
				http.Error(w, "Error processing request",
					http.StatusInternalServerError)
				return
			}
			projIDs := make([]int, len(projs))
			for i, p := range projs {
				projIDs[i] = int(p.ID)
			}
			docObj["projects"] = projIDs

			// Write response.
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)

			enc := json.NewEncoder(w)
			err = enc.Encode(docObj)
			if err != nil {
				srv.Logger.Error("error encoding document",
					"error", err,
					"doc_id", docID,
				)
				http.Error(w, "Error processing request",
					http.StatusInternalServerError)
				return
			}

			srv.Logger.Info("retrieved document",
				"doc_id", docID,
				"method", r.Method,
				"path", r.URL.Path,
			)

			// Request post-processing.
			go func() {
				// Update recently viewed documents if this is a document view event. The
				// Add-To-Recently-Viewed header is set in the request from the frontend
				// to differentiate between document views and requests to only retrieve
				// document metadata.
				if r.Header.Get("Add-To-Recently-Viewed") != "" {
					// Get authenticated user's email address.
					email := pkgauth.MustGetUserEmail(r.Context())

					if err := updateRecentlyViewedDocs(
						email, docID, srv.DB, now,
					); err != nil {
						srv.Logger.Error("error updating recently viewed docs",
							"error", err,
							"doc_id", docID,
							"method", r.Method,
							"path", r.URL.Path,
						)
					}
				}

				// Compare Algolia and database documents to find data inconsistencies.
				// Get document object from Algolia.
				var algoDoc map[string]any
				err = srv.AlgoSearch.Docs.GetObject(docID, &algoDoc)
				if err != nil {
					// Only warn because we might be in the process of saving the Algolia
					// object for a new document.
					srv.Logger.Warn("error getting Algolia object for data comparison",
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

		case "PATCH":
			// Decode request. The request struct validates that the request only
			// contains fields that are allowed to be patched.
			var req DocumentPatchRequest
			if err := decodeRequest(r, &req); err != nil {
				srv.Logger.Error("error decoding document patch request", "error", err)
				http.Error(w, fmt.Sprintf("Bad request: %q", err),
					http.StatusBadRequest)
				return
			}

			// Authorize request.
			userEmail := pkgauth.MustGetUserEmail(r.Context())
			if err := authorizeDocumentPatchRequest(
				userEmail, *doc, req,
			); err != nil {
				srv.Logger.Warn("error authorizing request",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID,
					"user", userEmail,
				)
				http.Error(w,
					fmt.Sprintf("Unauthorized: %v", err), http.StatusForbidden)
				return
			}

			// Validate owners.
			if req.Owners != nil {
				if len(*req.Owners) != 1 {
					srv.Logger.Warn("invalid number of owners in patch request",
						"method", r.Method,
						"path", r.URL.Path,
						"doc_id", docID)
					http.Error(w,
						"Bad request: invalid number of owners (only 1 allowed)",
						http.StatusBadRequest)
					return
				}
			}

			// Validate custom fields.
			if req.CustomFields != nil {
				for _, cf := range *req.CustomFields {
					cef, ok := doc.CustomEditableFields[cf.Name]
					if !ok {
						srv.Logger.Error("custom field not found",
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
						srv.Logger.Error("invalid custom field display name",
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
						srv.Logger.Error("invalid custom field type",
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

			// Validate document Status.
			if req.Status != nil {
				switch *req.Status {
				case "Approved":
				case "In-Review":
				case "Obsolete":
				default:
					srv.Logger.Warn("invalid status",
						"method", r.Method,
						"path", r.URL.Path,
						"doc_id", docID)
					http.Error(w, "Bad request: invalid status", http.StatusBadRequest)
					return
				}
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

			// Compare approvers in request and the current document (before we patch
			// the document) to find the approvers to email.
			var approversToEmail []string
			if len(doc.Approvers) == 0 && req.Approvers != nil &&
				len(*req.Approvers) != 0 {
				// If there are no approvers of the document email the approvers in the
				// request.
				approversToEmail = *req.Approvers
			} else if req.Approvers != nil && len(*req.Approvers) != 0 {
				// Only compare when there are stored approvers and approvers in the
				// request.
				approversToEmail = compareSlices(doc.Approvers, *req.Approvers)
			}
			if len(doc.ApproverGroups) == 0 && req.ApproverGroups != nil &&
				len(*req.ApproverGroups) != 0 {
				// If there are no approver groups for the document, add all approver
				// groups in the request.
				approversToEmail = append(approversToEmail, *req.ApproverGroups...)
			} else if req.ApproverGroups != nil && len(*req.ApproverGroups) != 0 {
				// Only compare when there are stored approver groups and approver
				// groups in the request.
				approversToEmail = append(
					approversToEmail,
					compareSlices(doc.ApproverGroups, *req.ApproverGroups)...,
				)
			}

			// Patch document (for Algolia).
			// Approvers.
			if req.Approvers != nil {
				doc.Approvers = *req.Approvers
			}
			// Approver groups.
			if req.ApproverGroups != nil {
				doc.ApproverGroups = *req.ApproverGroups
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
								srv.Logger.Error("error upserting custom string field",
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
							srv.Logger.Error("invalid value type for people custom field",
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
								srv.Logger.Error("invalid value type for people custom field",
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
							srv.Logger.Error("error upserting custom people field",
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
						srv.Logger.Error("invalid custom field type",
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
			// Owner.
			if req.Owners != nil {
				doc.Owners = *req.Owners

				// Give new owner edit access to the document.
				if err := srv.GWService.ShareFile(
					docID, doc.Owners[0], "writer"); err != nil {
					srv.Logger.Error("error sharing file with new owner",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"doc_id", docID,
						"new_owner", doc.Owners[0])
					http.Error(w, "Error patching document",
						http.StatusInternalServerError)
					return
				}
			}
			// Status.
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

			// Give new document approvers edit access to the document.
			for _, a := range approversToEmail {
				if err := srv.GWService.ShareFile(docID, a, "writer"); err != nil {
					srv.Logger.Error("error sharing file with approver",
						"error", err,
						"doc_id", docID,
						"method", r.Method,
						"path", r.URL.Path,
						"approver", a)
					http.Error(w, "Error patching document",
						http.StatusInternalServerError)
					return
				}
			}

			// Replace the doc header.
			if err := doc.ReplaceHeader(
				srv.Config.BaseURL, false, srv.GWService,
			); err != nil {
				srv.Logger.Error("error replacing document header",
					"error", err, "doc_id", docID)
				http.Error(w, "Error patching document",
					http.StatusInternalServerError)
				return
			}

			// Rename file with new title.
			srv.GWService.RenameFile(docID,
				fmt.Sprintf("[%s] %s", doc.DocNumber, doc.Title))

			// Get document record from database so we can modify it for updating.
			model := models.Document{
				GoogleFileID: docID,
			}
			if err := model.Get(srv.DB); err != nil {
				srv.Logger.Error("error getting document from database",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID,
				)
				http.Error(w, "Error patching document",
					http.StatusInternalServerError)
				return
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

				// Approver groups.
				if req.ApproverGroups != nil {
					approverGroups := make([]*models.Group, len(doc.ApproverGroups))
					for i, a := range doc.ApproverGroups {
						g := models.Group{
							EmailAddress: a,
						}
						approverGroups[i] = &g
					}
					model.ApproverGroups = approverGroups
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
								srv.Logger.Error("invalid value type for string custom field",
									"error", err,
									"method", r.Method,
									"path", r.URL.Path,
									"custom_field", cf.Name,
									"doc_id", docID)
								http.Error(w, "Error patching document",
									http.StatusInternalServerError)
								return
							}
						case "PEOPLE":
							if reflect.TypeOf(cf.Value).Kind() != reflect.Slice {
								srv.Logger.Error("invalid value type for people custom field",
									"error", err,
									"method", r.Method,
									"path", r.URL.Path,
									"custom_field", cf.Name,
									"doc_id", docID)
								http.Error(w, "Error patching document",
									http.StatusInternalServerError)
								return
							}
							cfVal := []string{}
							for _, v := range cf.Value.([]any) {
								if v, ok := v.(string); ok {
									cfVal = append(cfVal, v)
								} else {
									srv.Logger.Error("invalid value type for people custom field",
										"error", err,
										"method", r.Method,
										"path", r.URL.Path,
										"custom_field", cf.Name,
										"doc_id", docID)
									http.Error(w, "Error patching document",
										http.StatusInternalServerError)
									return
								}
							}

							model.CustomFields, err = models.
								UpsertStringSliceDocumentCustomField(
									model.CustomFields,
									doc.DocType,
									cf.DisplayName,
									cfVal,
								)
							if err != nil {
								srv.Logger.Error("invalid value type for people custom field",
									"error", err,
									"method", r.Method,
									"path", r.URL.Path,
									"custom_field", cf.Name,
									"doc_id", docID)
								http.Error(w, "Error patching document",
									http.StatusInternalServerError)
								return
							}
						default:
							srv.Logger.Error("invalid custom field type",
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

				// Owner.
				if req.Owners != nil {
					model.Owner = &models.User{
						EmailAddress: doc.Owners[0],
					}
				}

				// Status.
				if req.Status != nil {
					switch *req.Status {
					case "Approved":
						model.Status = models.ApprovedDocumentStatus
					case "In-Review":
						model.Status = models.InReviewDocumentStatus
					case "Obsolete":
						model.Status = models.ObsoleteDocumentStatus
					}
				}

				// Summary.
				if req.Summary != nil {
					model.Summary = req.Summary
				}

				// Title.
				if req.Title != nil {
					model.Title = *req.Title
				}

				// Send email to new owner.
				if srv.Config.Email != nil && srv.Config.Email.Enabled &&
					req.Owners != nil {
					// Get document URL.
					docURL, err := getDocumentURL(srv.Config.BaseURL, docID)
					if err != nil {
						srv.Logger.Error("error getting document URL",
							"error", err,
							"doc_id", docID,
							"method", r.Method,
							"path", r.URL.Path,
						)
						http.Error(w, "Error patching document",
							http.StatusInternalServerError)
						return
					}

					// Get name of new document owner.
					newOwner := email.User{
						EmailAddress: doc.Owners[0],
					}
					ppl, err := srv.GWService.SearchPeople(
						doc.Owners[0], "emailAddresses,names")
					if err != nil {
						srv.Logger.Warn("error searching directory for new owner",
							"error", err,
							"method", r.Method,
							"path", r.URL.Path,
							"doc_id", docID,
							"person", doc.Owners[0],
						)
					}
					if len(ppl) == 1 && ppl[0].Names != nil {
						newOwner.Name = ppl[0].Names[0].DisplayName
					}

					// Get name of old document owner.
					oldOwner := email.User{
						EmailAddress: userEmail,
					}
					ppl, err = srv.GWService.SearchPeople(
						userEmail, "emailAddresses,names")
					if err != nil {
						srv.Logger.Warn("error searching directory for old owner",
							"error", err,
							"method", r.Method,
							"path", r.URL.Path,
							"doc_id", docID,
							"person", doc.Owners[0],
						)
					}
					if len(ppl) == 1 && ppl[0].Names != nil {
						oldOwner.Name = ppl[0].Names[0].DisplayName
					}

					if err := email.SendNewOwnerEmail(
						email.NewOwnerEmailData{
							BaseURL:           srv.Config.BaseURL,
							DocumentShortName: doc.DocNumber,
							DocumentStatus:    doc.Status,
							DocumentTitle:     doc.Title,
							DocumentType:      doc.DocType,
							DocumentURL:       docURL,
							NewDocumentOwner:  newOwner,
							OldDocumentOwner:  oldOwner,
							Product:           doc.Product,
						},
						[]string{doc.Owners[0]},
						srv.Config.Email.FromAddress,
						srv.GWService,
					); err != nil {
						srv.Logger.Error("error sending new owner email",
							"error", err,
							"method", r.Method,
							"path", r.URL.Path,
							"doc_id", docID,
						)
						http.Error(w, "Error patching document",
							http.StatusInternalServerError)
						return
					}
				}

				// Send emails to new approvers.
				if srv.Config.Email != nil && srv.Config.Email.Enabled {
					if len(approversToEmail) > 0 {
						// Get document URL.
						docURL, err := getDocumentURL(srv.Config.BaseURL, docID)
						if err != nil {
							srv.Logger.Error("error getting document URL",
								"error", err,
								"doc_id", docID,
								"method", r.Method,
								"path", r.URL.Path,
							)
							http.Error(w, "Error patching document",
								http.StatusInternalServerError)
							return
						}

						// TODO: use an asynchronous method for sending emails because we
						// can't currently recover gracefully on a failure here.
						for _, approverEmail := range approversToEmail {
							err := email.SendReviewRequestedEmail(
								email.ReviewRequestedEmailData{
									BaseURL:           srv.Config.BaseURL,
									DocumentOwner:     doc.Owners[0],
									DocumentShortName: doc.DocNumber,
									DocumentTitle:     doc.Title,
									DocumentURL:       docURL,
									Product:           doc.Product,
									DocumentType:      doc.DocType,
									DocumentStatus:    doc.Status,
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
								http.Error(w, "Error patching document",
									http.StatusInternalServerError)
								return
							}
						}
						srv.Logger.Info("approver emails sent",
							"doc_id", docID,
							"method", r.Method,
							"path", r.URL.Path,
						)
					}
				}

				// Update document in the database.
				if err := model.Upsert(srv.DB); err != nil {
					srv.Logger.Error("error updating document",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"doc_id", docID,
					)
					http.Error(w, "Error patching document",
						http.StatusInternalServerError)
					return
				}
			}

			w.WriteHeader(http.StatusOK)
			srv.Logger.Info("patched document",
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

				// Save new modified doc object in Algolia.
				res, err := srv.AlgoWrite.Docs.SaveObject(docObj)
				if err != nil {
					srv.Logger.Error("error saving patched document in Algolia",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"doc_id", docID)
					return
				}
				err = res.Wait()
				if err != nil {
					srv.Logger.Error("error saving patched document in Algolia",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"doc_id", docID)
					return
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

	// Find recently viewed documents (excluding the current viewed document).
	var rvd []models.RecentlyViewedDoc
	if err := db.Where(&models.RecentlyViewedDoc{UserID: int(u.ID)}).
		Not("document_id = ?", doc.ID).
		Limit(9).
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

	// Make slice of recently viewed document IDs.
	docIDs := make([]int, len(rvd))
	for i, d := range rvd {
		docIDs[i] = d.DocumentID
	}

	// Get document records for recently viewed documents.
	var docs []models.Document
	if err := db.Where("id IN ?", docIDs).Find(&docs).Error; err != nil {
		return fmt.Errorf("error getting documents: %w", err)
	}

	// Update user.
	u.RecentlyViewedDocs = docs
	if err := u.Upsert(db); err != nil {
		return fmt.Errorf("error upserting user: %w", err)
	}

	// Update ViewedAt time for the viewed document.
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
			`^\/api\/v2\/%s\/([0-9A-Za-z_\-]+)$`,
			collection))
	relatedResourcesSubcollectionRE := regexp.MustCompile(
		fmt.Sprintf(
			`^\/api\/v2\/%s\/([0-9A-Za-z_\-]+)\/related-resources$`,
			collection))
	// shareable isn't really a subcollection, but we'll go with it.
	shareableRE := regexp.MustCompile(
		fmt.Sprintf(
			`^\/api\/v2\/%s\/([0-9A-Za-z_\-]+)\/shareable$`,
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

// authorizeDocumentPatchRequest authorizes a PATCH request to a document.
func authorizeDocumentPatchRequest(
	userEmail string,
	doc document.Document,
	req DocumentPatchRequest,
) error {
	// The document owner can patch any field.
	if doc.Owners[0] == userEmail {
		return nil
	}

	// Approvers can only patch the Approvers field to remove themselves as an
	// approver.
	if helpers.StringSliceContains(doc.Approvers, userEmail) {
		// Request should only have one non-nil field, Approvers.
		numNonNilFields := 0
		reqValue := reflect.ValueOf(req)
		for i := 0; i < reqValue.NumField(); i++ {
			fieldValue := reqValue.Field(i)
			if fieldValue.Kind() == reflect.Ptr && !fieldValue.IsNil() {
				numNonNilFields++
			}
		}
		if numNonNilFields != 1 || req.Approvers == nil {
			return errors.New(
				"approvers can only patch the approvers field to remove themselves as an approver")
		}

		// Remove duplicates from request and document approvers to be safe.
		reqApprovers := helpers.RemoveStringSliceDuplicates(*req.Approvers)
		docApprovers := helpers.RemoveStringSliceDuplicates(doc.Approvers)

		// Request approvers should be one less than document approvers.
		if len(reqApprovers) != len(docApprovers)-1 {
			return errors.New(
				"approvers can only patch a document to remove themselves as an approver")
		}

		// Request approvers should be a subset of document approvers and not
		// contain the requesting user.
		for _, ra := range reqApprovers {
			if ra == userEmail || !helpers.StringSliceContains(docApprovers, ra) {
				return errors.New(
					"approvers can only patch a document to remove themselves as an approver")
			}
		}

		return nil
	}

	return errors.New("only owners or approvers can patch a document")
}
