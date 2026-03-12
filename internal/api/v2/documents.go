package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"reflect"
	"regexp"
	"slices"
	"strings"
	"time"

	"github.com/hashicorp-forge/hermes/internal/email"
	"github.com/hashicorp-forge/hermes/internal/helpers"
	"github.com/hashicorp-forge/hermes/internal/server"
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
	archivedDocumentSubcollectionRequestType
)

var publishReaderGroups = []string{}

var publishGroupDisplayNames = map[string]string{}

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

		model := srv.NewDocumentByFileID(docID)

		// Get document from database.
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
			Document: srv.NewDocumentByFileID(docID),
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
			Document: srv.NewDocumentByFileID(docID),
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
				w, r, docID, *doc, srv.Config, srv.Logger, srv.AlgoSearch, srv.DB, srv.IsSharePoint())
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
		case "HEAD":
			// HEAD: respond with 200, and for SharePoint documents expose
			// the direct edit URL header so the frontend can redirect.
			// For Google documents, return 200 without the header so the
			// frontend falls through to normal in-app document viewing.
			now := time.Now()

			// Drafts are not accessible via documents API (mirror GET behavior)
			if doc.AppCreated && doc.Status == "WIP" {
				w.WriteHeader(http.StatusNotFound)
				return
			}

			if srv.SharePoint != nil {
				fileDetails, err := srv.SharePoint.GetFileDetails(docID)
				if err != nil {
					srv.Logger.Error("error getting document file (HEAD)",
						"error", err,
						"path", r.URL.Path,
						"method", r.Method,
						"doc_id", docID,
					)
					http.Error(w, "Error requesting document", http.StatusInternalServerError)
					return
				}
				w.Header().Set("X-Direct-Edit-URL", fileDetails.WebURL)
			}

			w.Header().Set("Cache-Control", "private, no-store")
			w.WriteHeader(http.StatusOK)
			if r.Header.Get("Add-To-Recently-Viewed") != "" {
				go func() {
					email := r.Context().Value("userEmail").(string)
					if err := updateRecentlyViewedDocs(email, docID, srv.DB, now, srv.IsSharePoint()); err != nil {
						srv.Logger.Error("error updating recently viewed docs (HEAD)",
							"error", err,
							"doc_id", docID,
							"method", r.Method,
							"path", r.URL.Path,
						)
					}
				}()
			}
			return
		case "GET":
			now := time.Now()

			var directEditURL string
			if srv.SharePoint != nil {
				// Get file details from SharePoint
				fileDetails, err := srv.SharePoint.GetFileDetails(docID)
				if err != nil {
					srv.Logger.Error("error getting document file",
						"error", err,
						"path", r.URL.Path,
						"method", r.Method,
						"doc_id", docID,
					)
					http.Error(w,
						"Error requesting document", http.StatusInternalServerError)
					return
				}

				// Parse modified time
				modifiedTime, err := time.Parse(time.RFC3339, fileDetails.LastModified)
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
				directEditURL = fileDetails.WebURL
			} else {
				// Get file from Google Drive
				file, err := srv.GWService.GetFile(docID)
				if err != nil {
					srv.Logger.Error("error getting document file",
						"error", err,
						"path", r.URL.Path,
						"method", r.Method,
						"doc_id", docID,
					)
					http.Error(w,
						"Error requesting document", http.StatusInternalServerError)
					return
				}

				modifiedTime, err := time.Parse(time.RFC3339, file.ModifiedTime)
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
				directEditURL = file.WebViewLink
			}

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

			// Set the directEditURL for direct link to the document
			docObj["directEditURL"] = directEditURL

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
				"status", doc.Status,
			)

			// Request post-processing.
			go func() {
				// Update recently viewed documents if this is a document view event. The
				// Add-To-Recently-Viewed header is set in the request from the frontend
				// to differentiate between document views and requests to only retrieve
				// document metadata.
				if r.Header.Get("Add-To-Recently-Viewed") != "" {
					// Get authenticated user's email address.
					email := r.Context().Value("userEmail").(string)

					if err := updateRecentlyViewedDocs(
						email, docID, srv.DB, now, srv.IsSharePoint(),
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
				dbDoc := srv.NewDocumentByFileID(docID)
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
					Document: srv.NewDocumentByFileID(docID),
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
			userEmail := r.Context().Value("userEmail").(string)
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

			// Check if document is locked (Google-only).
			if !srv.IsSharePoint() {
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
			}

			previousStatus := doc.Status

			// Additional validation for contributor ownership acquisition
			if isContributorAcquiringOwnership(userEmail, *doc, req) {
				// Check if current owner is still active in the company
				currentOwner := doc.Owners[0]
				srv.Logger.Info("validating ownership acquisition: checking if current owner is alumni",
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID,
					"contributor", userEmail,
					"current_owner", currentOwner)

				// Search for the current owner in the people directory
				var ownerFound bool
				if srv.SharePoint != nil {
					people, err := srv.SharePoint.SearchPeople(currentOwner, 1)
					if err != nil {
						srv.Logger.Error("error searching for current owner in people directory",
							"error", err,
							"method", r.Method,
							"path", r.URL.Path,
							"doc_id", docID,
							"current_owner", currentOwner)
						http.Error(w, "Error validating ownership acquisition request",
							http.StatusInternalServerError)
						return
					}
					ownerFound = len(people) > 0
				} else {
					ppl, err := srv.GWService.SearchPeople(
						currentOwner, "emailAddresses,names")
					if err != nil {
						srv.Logger.Error("error searching for current owner in people directory",
							"error", err,
							"method", r.Method,
							"path", r.URL.Path,
							"doc_id", docID,
							"current_owner", currentOwner)
						http.Error(w, "Error validating ownership acquisition request",
							http.StatusInternalServerError)
						return
					}
					ownerFound = len(ppl) > 0
				}

				// If current owner is found in people directory, they are still active
				if ownerFound {
					srv.Logger.Warn("ownership acquisition denied: current owner is still active",
						"method", r.Method,
						"path", r.URL.Path,
						"doc_id", docID,
						"contributor", userEmail,
						"current_owner", currentOwner)
					http.Error(w,
						"Current owner is still active in company directory; Please contact them to transfer ownership",
						http.StatusForbidden)
					return
				}

				srv.Logger.Info("ownership acquisition authorized: current owner not found in company directory",
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID,
					"contributor", userEmail,
					"current_owner", currentOwner)
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

			// Determine newly added individual approvers and group approvers (pre-patch state vs request).
			var newUserApprovers []string
			var newGroupApprovers []string
			if req.Approvers != nil && len(*req.Approvers) > 0 {
				if len(doc.Approvers) == 0 { // no existing approvers => all are new
					newUserApprovers = append(newUserApprovers, *req.Approvers...)
				} else {
					newUserApprovers = compareSlices(doc.Approvers, *req.Approvers)
				}
			}
			if req.ApproverGroups != nil && len(*req.ApproverGroups) > 0 {
				if len(doc.ApproverGroups) == 0 { // no existing groups => all are new
					newGroupApprovers = append(newGroupApprovers, *req.ApproverGroups...)
				} else {
					newGroupApprovers = compareSlices(doc.ApproverGroups, *req.ApproverGroups)
				}
			}

			// Determine removed individual approvers and group approvers (to revoke access).
			var removedUserApprovers []string
			var removedGroupApprovers []string
			if req.Approvers != nil {
				if len(doc.Approvers) != 0 {
					if len(*req.Approvers) == 0 {
						// All approvers are being removed
						removedUserApprovers = doc.Approvers
					} else {
						// Compare approvers when there are stored approvers
						// and there are approvers in the request
						// Find approvers that exist in current doc but NOT in the request
						removedUserApprovers = compareSlices(
							*req.Approvers, doc.Approvers)
					}
				}
			}
			if req.ApproverGroups != nil {
				if len(doc.ApproverGroups) != 0 {
					if len(*req.ApproverGroups) == 0 {
						// All approver groups are being removed
						removedGroupApprovers = doc.ApproverGroups
					} else {
						// Find approver groups that exist in current doc but NOT in the request
						removedGroupApprovers = compareSlices(
							*req.ApproverGroups, doc.ApproverGroups)
					}
				}
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
			var newContributors []string
			var contributorsToAddSharing []string
			var contributorsToRemoveSharing []string
			if req.Contributors != nil {
				// Determine newly added contributors for email notifications
				if len(doc.Contributors) == 0 && len(*req.Contributors) > 0 {
					// No existing contributors => all are new
					newContributors = append(newContributors, *req.Contributors...)
					contributorsToAddSharing = *req.Contributors
				} else if len(*req.Contributors) > 0 {
					// Find contributors that exist in request but NOT in current doc
					newContributors = compareSlices(doc.Contributors, *req.Contributors)
					contributorsToAddSharing = compareSlices(doc.Contributors, *req.Contributors)
				}

				// Find out contributors to remove from sharing the document
				if len(doc.Contributors) != 0 {
					if len(*req.Contributors) == 0 {
						// All contributors are being removed
						contributorsToRemoveSharing = doc.Contributors
					} else {
						// Compare contributors when there are stored contributors
						// and there are contributors in the request
						// Find contributors that exist in current doc but NOT in the request
						contributorsToRemoveSharing = compareSlices(
							*req.Contributors, doc.Contributors)
					}
				}

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
				// Check if this is a contributor acquiring ownership
				isAcquireOwnership := isContributorAcquiringOwnership(userEmail, *doc, req)

				if isAcquireOwnership {
					srv.Logger.Info("contributor acquiring document ownership",
						"method", r.Method,
						"path", r.URL.Path,
						"doc_id", docID,
						"contributor", userEmail,
						"previous_owner", doc.Owners[0])
				}

				doc.Owners = *req.Owners

				// Give new owner edit access to the document.
				if srv.SharePoint != nil {
					if err := srv.SharePoint.ShareFile(
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
				} else {
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

				// Rename the file to match the new title.
				abbr := strings.SplitN(doc.DocNumber, "-", 2)[0]
				newFileName := fmt.Sprintf("%s-%s", abbr, *req.Title)

				if srv.SharePoint != nil {
					// Sanitize the file name for SharePoint.
					newFileName = strings.NewReplacer(
						"[", "(", "]", ")", "#", "-", "%", "-", "&", "and",
						"*", "-", ":", "-", "<", "-", ">", "-", "?", "",
						"/", "-", "\\", "-", "{", "(", "|", "-", "}", ")",
						"~", "-",
					).Replace(newFileName)
					newFileName = fmt.Sprintf("%s.docx", newFileName)

					if err := srv.SharePoint.RenameFile(docID, newFileName); err != nil {
						srv.Logger.Error("error renaming file",
							"error", err,
							"method", r.Method,
							"path", r.URL.Path,
							"doc_id", docID,
							"new_file_name", newFileName)
						srv.Logger.Warn("continuing document patch despite file rename failure")
					} else {
						srv.Logger.Info("successfully renamed file",
							"method", r.Method,
							"path", r.URL.Path,
							"doc_id", docID,
							"new_file_name", newFileName)
					}
				} else {
					if err := srv.GWService.RenameFile(docID, newFileName); err != nil {
						srv.Logger.Error("error renaming file",
							"error", err,
							"method", r.Method,
							"path", r.URL.Path,
							"doc_id", docID,
							"new_file_name", newFileName)
						srv.Logger.Warn("continuing document patch despite file rename failure")
					}
				}
			}

			// Share file with contributors.
			if len(contributorsToAddSharing) > 0 {
				if srv.SharePoint != nil {
					if err := srv.SharePoint.ShareFileWithMultipleUsers(docID, "writer", contributorsToAddSharing); err != nil {
						srv.Logger.Error("error sharing file with new contributors",
							"error", err,
							"method", r.Method,
							"path", r.URL.Path,
							"doc_id", docID,
							"contributors", contributorsToAddSharing)
						http.Error(w, "Error patching document", http.StatusInternalServerError)
						return
					}
				} else {
					for _, user := range contributorsToAddSharing {
						if err := srv.GWService.ShareFile(docID, user, "writer"); err != nil {
							srv.Logger.Error("error sharing file with new contributor",
								"error", err,
								"method", r.Method,
								"path", r.URL.Path,
								"doc_id", docID,
								"contributor", user)
							http.Error(w, "Error patching document", http.StatusInternalServerError)
							return
						}
					}
				}
				srv.Logger.Info("shared document with contributors",
					"method", r.Method,
					"path", r.URL.Path,
					"contributors_count", len(contributorsToAddSharing),
				)
			}

			// Share with newly added individual approvers (batch for efficiency).
			if len(newUserApprovers) > 0 {
				if srv.SharePoint != nil {
					if err := srv.SharePoint.ShareFileWithMultipleUsers(docID, "writer", newUserApprovers); err != nil {
						srv.Logger.Error("error sharing file with new user approvers",
							"error", err,
							"doc_id", docID,
							"method", r.Method,
							"path", r.URL.Path,
							"approvers", newUserApprovers)
						http.Error(w, "Error patching document", http.StatusInternalServerError)
						return
					}
				} else {
					for _, user := range newUserApprovers {
						if err := srv.GWService.ShareFile(docID, user, "writer"); err != nil {
							srv.Logger.Error("error sharing file with new user approver",
								"error", err,
								"doc_id", docID,
								"method", r.Method,
								"path", r.URL.Path,
								"approver", user)
							http.Error(w, "Error patching document", http.StatusInternalServerError)
							return
						}
					}
				}
			}

			// Share with newly added group approvers using group-aware logic (DL expansion vs direct share).
			for _, gEmail := range newGroupApprovers {
				if srv.SharePoint != nil {
					if err := srv.SharePoint.ShareFileWithGroupOrMembers(docID, gEmail, "writer"); err != nil {
						srv.Logger.Error("error sharing file with new group approver",
							"error", err,
							"doc_id", docID,
							"method", r.Method,
							"path", r.URL.Path,
							"group", gEmail)
						http.Error(w, "Error patching document", http.StatusInternalServerError)
						return
					}
				} else {
					if err := srv.GWService.ShareFile(docID, gEmail, "writer"); err != nil {
						srv.Logger.Error("error sharing file with new group approver",
							"error", err,
							"doc_id", docID,
							"method", r.Method,
							"path", r.URL.Path,
							"group", gEmail)
						http.Error(w, "Error patching document", http.StatusInternalServerError)
						return
					}
				}
			}

			// Remove access for removed approvers, approver groups, and contributors.
			// Build a map of email addresses to permission IDs to facilitate removal.
			if len(removedUserApprovers) > 0 || len(removedGroupApprovers) > 0 || len(contributorsToRemoveSharing) > 0 {
				emailToPermissionIDsMap := make(map[string][]string)

				if srv.SharePoint != nil {
					permissions, err := srv.SharePoint.ListPermissions(docID)
					if err != nil {
						srv.Logger.Error("error listing permissions for document",
							"error", err,
							"method", r.Method,
							"path", r.URL.Path,
							"doc_id", docID)
						http.Error(w, "Error patching document",
							http.StatusInternalServerError)
						return
					}
					for _, p := range permissions {
						if p.GrantedTo.User.Email == "" {
							continue
						}
						if slices.Contains(p.Role, "owner") {
							continue
						}
						email := p.GrantedTo.User.Email
						if _, exists := emailToPermissionIDsMap[email]; !exists {
							emailToPermissionIDsMap[email] = make([]string, 0)
						}
						emailToPermissionIDsMap[email] = append(
							emailToPermissionIDsMap[email], p.ID)
					}
				} else {
					permissions, err := srv.GWService.ListPermissions(docID)
					if err != nil {
						srv.Logger.Error("error listing permissions for document",
							"error", err,
							"method", r.Method,
							"path", r.URL.Path,
							"doc_id", docID)
						http.Error(w, "Error patching document",
							http.StatusInternalServerError)
						return
					}
					for _, p := range permissions {
						if p.EmailAddress == "" {
							continue
						}
						if p.Role == "owner" {
							continue
						}
						if _, exists := emailToPermissionIDsMap[p.EmailAddress]; !exists {
							emailToPermissionIDsMap[p.EmailAddress] = make([]string, 0)
						}
						emailToPermissionIDsMap[p.EmailAddress] = append(
							emailToPermissionIDsMap[p.EmailAddress], p.Id)
					}
				}

				// Remove individual approvers.
				for _, a := range removedUserApprovers {
					// Only remove approver if the email associated with the permission
					// doesn't match owner email(s).
					if !contains(doc.Owners, a) {
						if err := removeSharing(srv, docID, a, emailToPermissionIDsMap); err != nil {
							srv.Logger.Error("error removing approver from file",
								"error", err,
								"method", r.Method,
								"path", r.URL.Path,
								"doc_id", docID,
								"approver", a)
							http.Error(w, "Error patching document",
								http.StatusInternalServerError)
							return
						}
					}
				}
				if len(removedUserApprovers) > 0 {
					srv.Logger.Info("removed approvers from document",
						"method", r.Method,
						"path", r.URL.Path,
						"approvers_count", len(removedUserApprovers),
					)
				}

				// Remove group approvers.
				for _, g := range removedGroupApprovers {
					// Only remove group if it doesn't match owner email(s).
					if !contains(doc.Owners, g) {
						if err := removeSharing(srv, docID, g, emailToPermissionIDsMap); err != nil {
							srv.Logger.Error("error removing approver group from file",
								"error", err,
								"method", r.Method,
								"path", r.URL.Path,
								"doc_id", docID,
								"approver_group", g)
							http.Error(w, "Error patching document",
								http.StatusInternalServerError)
							return
						}
					}
				}
				if len(removedGroupApprovers) > 0 {
					srv.Logger.Info("removed approver groups from document",
						"method", r.Method,
						"path", r.URL.Path,
						"approver_groups_count", len(removedGroupApprovers),
					)
				}

				// Remove contributors.
				for _, c := range contributorsToRemoveSharing {
					// Only remove contributor if the email
					// associated with the permission doesn't
					// match owner email(s).
					if !contains(doc.Owners, c) {
						if err := removeSharing(srv, docID, c, emailToPermissionIDsMap); err != nil {
							srv.Logger.Error("error removing contributor from file",
								"error", err,
								"method", r.Method,
								"path", r.URL.Path,
								"doc_id", docID,
								"contributor", c)
							http.Error(w, "Error patching document",
								http.StatusInternalServerError)
							return
						}
					}
				}
				if len(contributorsToRemoveSharing) > 0 {
					srv.Logger.Info("removed contributors from document",
						"method", r.Method,
						"path", r.URL.Path,
						"contributors_count", len(contributorsToRemoveSharing),
					)
				}
			}

			// Replace the doc header (Google-only; SharePoint headers
			// are managed by the Hermes Add-In for Word).
			if !srv.IsSharePoint() {
				if err := doc.ReplaceHeader(
					srv.Config.BaseURL, false, srv.GWService,
				); err != nil {
					srv.Logger.Error("error replacing document header",
						"error", err, "doc_id", docID)
					http.Error(w, "Error patching document",
						http.StatusInternalServerError)
					return
				}
			}

			// Get document record from database so we can modify it for updating.
			model := srv.NewDocumentByFileID(docID)
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
						// Log error but don't fail the request.
					} else {
						// Get name of new document owner.
						newOwner := email.User{
							EmailAddress: doc.Owners[0],
						}
						if srv.SharePoint != nil {
							person, err := srv.SharePoint.GetPersonByEmail(doc.Owners[0])
							if err != nil {
								srv.Logger.Warn("error getting person details for new owner",
									"error", err,
									"method", r.Method,
									"path", r.URL.Path,
									"doc_id", docID,
									"person", doc.Owners[0],
								)
							} else if person != nil && person.DisplayName != "" {
								newOwner.Name = person.DisplayName
							}
						} else {
							ppl, err := srv.GWService.SearchPeople(doc.Owners[0], "emailAddresses,names")
							if err != nil {
								srv.Logger.Warn("error getting person details for new owner",
									"error", err,
									"method", r.Method,
									"path", r.URL.Path,
									"doc_id", docID,
									"person", doc.Owners[0],
								)
							} else if len(ppl) > 0 && len(ppl[0].Names) > 0 {
								newOwner.Name = ppl[0].Names[0].DisplayName
							}
						}

						// Get name of old document owner.
						oldOwner := email.User{
							EmailAddress: userEmail,
						}
						if srv.SharePoint != nil {
							person, err := srv.SharePoint.GetPersonByEmail(userEmail)
							if err != nil {
								srv.Logger.Warn("error getting person details for old owner",
									"error", err,
									"method", r.Method,
									"path", r.URL.Path,
									"doc_id", docID,
									"person", userEmail,
								)
							} else if person != nil && person.DisplayName != "" {
								oldOwner.Name = person.DisplayName
							}
						} else {
							ppl, err := srv.GWService.SearchPeople(userEmail, "emailAddresses,names")
							if err != nil {
								srv.Logger.Warn("error getting person details for old owner",
									"error", err,
									"method", r.Method,
									"path", r.URL.Path,
									"doc_id", docID,
									"person", userEmail,
								)
							} else if len(ppl) > 0 && len(ppl[0].Names) > 0 {
								oldOwner.Name = ppl[0].Names[0].DisplayName
							}
						}

						// Send email asynchronously to avoid blocking the response.
						go func() {
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
								srv.GetEmailSender(),
							); err != nil {
								srv.Logger.Error("error sending new owner email",
									"error", err,
									"doc_id", docID,
									"new_owner", doc.Owners[0],
								)
							} else {
								srv.Logger.Info("new owner email sent",
									"doc_id", docID,
									"new_owner", doc.Owners[0],
								)
							}
						}()
					}
				}

				// Send emails to new approvers.
				if srv.Config.Email != nil && srv.Config.Email.Enabled {
					// Collect new approvers (individuals and groups)
					newApproverRecipients := []string{}

					// Add new individual approvers
					newApproverRecipients = append(newApproverRecipients, newUserApprovers...)

					// Add new group approvers directly (send to group mailbox)
					newApproverRecipients = append(newApproverRecipients, newGroupApprovers...)

					if len(newApproverRecipients) > 0 {
						// Get document URL.
						docURL, err := getDocumentURL(srv.Config.BaseURL, docID)
						if err != nil {
							srv.Logger.Error("error getting document URL",
								"error", err,
								"doc_id", docID,
								"method", r.Method,
								"path", r.URL.Path,
							)
							// Log error but don't fail the request.
						} else {
							srv.Logger.Info("review request email queued",
								"doc_id", docID,
								"approver_count", len(newApproverRecipients),
								"method", r.Method,
								"path", r.URL.Path,
							)

							go helpers.SendEmailWithRetry(
								&srv,
								func() error {
									return email.SendReviewRequestedEmail(
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
										newApproverRecipients,
										srv.Config.Email.FromAddress,
										srv.GetEmailSender(),
									)
								},
								docID,
								"review_requested",
								r,
							)
						}
					}
				}

				if len(newContributors) > 0 {
					docURL := fmt.Sprintf("%s/document/%s", srv.Config.BaseURL, docID)
					if doc.Status != "Approved" {
						docURL += "?draft=true"
					}

					srv.Logger.Info("contributor email queued",
						"doc_id", docID,
						"contributor_count", len(newContributors),
						"method", r.Method,
						"path", r.URL.Path,
					)

					go helpers.SendEmailWithRetry(
						&srv,
						func() error {
							return email.SendContributorAddedEmail(
								email.ContributorAddedEmailData{
									BaseURL:           srv.Config.BaseURL,
									DocumentOwner:     doc.Owners[0],
									DocumentShortName: doc.DocNumber,
									DocumentTitle:     doc.Title,
									DocumentURL:       docURL,
									Product:           doc.Product,
									DocumentType:      doc.DocType,
									DocumentStatus:    doc.Status,
								},
								newContributors,
								srv.Config.Email.FromAddress,
								srv.GetEmailSender(),
							)
						},
						docID,
						"contributor_added",
						r,
					)
				}

				isPublishTransition := strings.EqualFold(previousStatus, "WIP") &&
					strings.EqualFold(doc.Status, "In-Review")

				if isPublishTransition {
					if srv.SharePoint != nil {
						grantedGroups, err := srv.SharePoint.GrantGroupsReadAccess(docID, "reader", publishReaderGroups, publishGroupDisplayNames)
						if err != nil {
							srv.Logger.Error("error granting reader access to publish groups",
								"error", err,
								"doc_id", docID,
							)
							http.Error(w, "Error patching document", http.StatusInternalServerError)
							return
						}
						if len(grantedGroups) > 0 {
							srv.Logger.Info("granted group access on publish",
								"doc_id", docID,
								"groups", strings.Join(grantedGroups, ", "),
							)
						}
					} else {
						var grantedGroups []string
						for _, group := range publishReaderGroups {
							if err := srv.GWService.ShareFile(docID, group, "reader"); err != nil {
								srv.Logger.Error("error granting reader access to publish group",
									"error", err,
									"doc_id", docID,
									"group", group,
								)
								http.Error(w, "Error patching document", http.StatusInternalServerError)
								return
							}
							grantedGroups = append(grantedGroups, group)
						}
						if len(grantedGroups) > 0 {
							srv.Logger.Info("granted group access on publish",
								"doc_id", docID,
								"groups", strings.Join(grantedGroups, ", "),
							)
						}
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

			// Log document access with Datadog ACCESS tag
			operation, updatedAttrs := buildDocumentOperation(req)
			srv.Logger.Info("ACCESS",
				"user_email", userEmail,
				"doc_id", docID,
				"operation", operation,
				"updated_attributes", updatedAttrs,
				"mode", "published",
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
				dbDoc := srv.NewDocumentByFileID(docID)

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
					Document: srv.NewDocumentByFileID(docID),
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
	email, docID string, db *gorm.DB, viewedAt time.Time, useSharePoint bool) error {
	// Get user (if exists).
	u := models.User{
		EmailAddress: email,
	}
	if err := u.Get(db); err != nil && !errors.Is(
		err, gorm.ErrRecordNotFound) {
		return fmt.Errorf("error getting user in database: %w", err)
	}

	// Get viewed document in database.
	doc := models.NewDocumentByFileID(docID, useSharePoint)
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
	// archived isn't really a subcollection, but we'll go with it.
	archivedRE := regexp.MustCompile(
		fmt.Sprintf(
			`^\/api\/v2\/%s\/([0-9A-Za-z_\-]+)\/archived$`,
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

	case archivedRE.MatchString(path):
		matches := archivedRE.
			FindStringSubmatch(path)
		if len(matches) != 2 {
			return "",
				archivedDocumentSubcollectionRequestType,
				fmt.Errorf(
					"wrong number of string submatches for archived subcollection URL path")
		}
		return matches[1], archivedDocumentSubcollectionRequestType, nil

	default:
		return "",
			unspecifiedDocumentSubcollectionRequestType,
			fmt.Errorf("path did not match any URL strings")
	}
}

func isContributorAcquiringOwnership(
	userEmail string,
	doc document.Document,
	req DocumentPatchRequest,
) bool {
	if req.Owners == nil || len(*req.Owners) != 1 {
		return false
	}

	if strings.EqualFold(doc.Owners[0], userEmail) {
		return false
	}

	if !helpers.StringSliceContainsFold(doc.Contributors, userEmail) {
		return false
	}

	return strings.EqualFold((*req.Owners)[0], userEmail)
}

// authorizeDocumentPatchRequest authorizes a PATCH request to a document.
//   - Document owners can patch any field.
//   - Approvers can only patch the Approvers field to remove themselves.
//   - Contributors can only patch the Owners field to acquire ownership (setting themselves as the sole owner).
//     Additional validation in the main handler ensures the current owner is no longer with the company.
func authorizeDocumentPatchRequest(
	userEmail string,
	doc document.Document,
	req DocumentPatchRequest,
) error {
	// The document owner can patch any field.
	if strings.EqualFold(doc.Owners[0], userEmail) {
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
			if strings.EqualFold(ra, userEmail) || !helpers.StringSliceContains(docApprovers, ra) {
				return errors.New(
					"approvers can only patch a document to remove themselves as an approver")
			}
		}

		return nil
	}

	// Contributors can only patch the Owners field to acquire ownership of the document.
	if helpers.StringSliceContainsFold(doc.Contributors, userEmail) {
		// Request should only have one non-nil field, Owners.
		numNonNilFields := 0
		reqValue := reflect.ValueOf(req)
		for i := 0; i < reqValue.NumField(); i++ {
			fieldValue := reqValue.Field(i)
			if fieldValue.Kind() == reflect.Ptr && !fieldValue.IsNil() {
				numNonNilFields++
			}
		}
		if numNonNilFields != 1 || req.Owners == nil {
			return errors.New(
				"contributors can only patch the owners field to acquire ownership")
		}

		// The Owners field should contain exactly one email (the contributor's email).
		if len(*req.Owners) != 1 {
			return errors.New(
				"contributors can only acquire ownership by setting themselves as the sole owner")
		}

		// The email in the Owners field must match the requesting user's email.
		if !strings.EqualFold((*req.Owners)[0], userEmail) {
			return errors.New(
				"contributors can only acquire ownership by setting themselves as the owner")
		}

		return nil
	}

	return errors.New("only owners, approvers, or contributors can patch a document")
}

// buildDocumentOperation determines the primary operation and builds a list of updated attributes
// from a DocumentPatchRequest for logging purposes.
func buildDocumentOperation(req DocumentPatchRequest) (string, string) {
	var attrs []string
	var operation string

	// Determine primary operation based on what's being changed
	if req.Owners != nil {
		operation = "ownership_transferred"
		attrs = append(attrs, "owners")
	}
	if req.Status != nil {
		if operation == "" {
			operation = "status_changed"
		}
		attrs = append(attrs, "status")
	}
	if req.Approvers != nil {
		if operation == "" {
			operation = "approvers_updated"
		}
		attrs = append(attrs, "approvers")
	}
	if req.ApproverGroups != nil {
		if operation == "" {
			operation = "approver_groups_updated"
		}
		attrs = append(attrs, "approverGroups")
	}
	if req.Contributors != nil {
		if operation == "" {
			operation = "contributors_updated"
		}
		attrs = append(attrs, "contributors")
	}
	if req.CustomFields != nil {
		if operation == "" {
			operation = "custom_fields_updated"
		}
		attrs = append(attrs, "customFields")
	}
	if req.Summary != nil {
		if operation == "" {
			operation = "summary_updated"
		}
		attrs = append(attrs, "summary")
	}
	if req.Title != nil {
		if operation == "" {
			operation = "title_updated"
		}
		attrs = append(attrs, "title")
	}

	if operation == "" {
		operation = "document_updated"
	}

	// If multiple fields updated, mark as bulk update
	if len(attrs) > 1 {
		operation = "document_bulk_update"
	}

	var attrsList string
	if len(attrs) == 0 {
		attrsList = "none"
	} else {
		attrsList = fmt.Sprintf("[%s]", strings.Join(attrs, ", "))
	}

	return operation, attrsList
}
