package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"slices"

	"reflect"
	"strconv"
	"strings"
	"time"

	"github.com/algolia/algoliasearch-client-go/v3/algolia/opt"
	"github.com/algolia/algoliasearch-client-go/v3/algolia/search"
	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/internal/email"
	"github.com/hashicorp-forge/hermes/internal/helpers"
	"github.com/hashicorp-forge/hermes/internal/server"
	"github.com/hashicorp-forge/hermes/pkg/document"
	hcd "github.com/hashicorp-forge/hermes/pkg/hashicorpdocs"
	"github.com/hashicorp-forge/hermes/pkg/models"
	"golang.org/x/oauth2/jwt"
	"google.golang.org/api/drive/v3"
	"google.golang.org/api/option"
	"gorm.io/gorm"
)

type DraftsRequest struct {
	Contributors        []string `json:"contributors,omitempty"`
	DocType             string   `json:"docType,omitempty"`
	Product             string   `json:"product,omitempty"`
	ProductAbbreviation string   `json:"productAbbreviation,omitempty"`
	Summary             string   `json:"summary,omitempty"`
	Tags                []string `json:"tags,omitempty"`
	Title               string   `json:"title"`
}

// DraftsPatchRequest contains a subset of drafts fields that are allowed to
// be updated with a PATCH request.
type DraftsPatchRequest struct {
	Approvers      *[]string               `json:"approvers,omitempty"`
	ApproverGroups *[]string               `json:"approverGroups,omitempty"`
	Contributors   *[]string               `json:"contributors,omitempty"`
	CustomFields   *[]document.CustomField `json:"customFields,omitempty"`
	Owners         *[]string               `json:"owners,omitempty"`
	Product        *string                 `json:"product,omitempty"`
	Summary        *string                 `json:"summary,omitempty"`
	// Tags                []string `json:"tags,omitempty"`
	Title *string `json:"title,omitempty"`
}

type DraftsResponse struct {
	ID string `json:"id"`
}

func DraftsHandler(srv server.Server) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		errResp := func(httpCode int, userErrMsg, logErrMsg string, err error) {
			srv.Logger.Error(logErrMsg,
				"method", r.Method,
				"path", r.URL.Path,
				"error", err,
			)
			http.Error(w, userErrMsg, httpCode)
		}

		// Authorize request.
		userEmail := r.Context().Value("userEmail").(string)
		if userEmail == "" {
			errResp(
				http.StatusUnauthorized,
				"No authorization information for request",
				"no user email found in request context",
				nil,
			)
			return
		}

		switch r.Method {
		case "POST":
			// Decode request.
			var req DraftsRequest
			if err := decodeRequest(r, &req); err != nil {
				srv.Logger.Error("error decoding drafts request", "error", err)
				http.Error(w, fmt.Sprintf("Bad request: %q", err),
					http.StatusBadRequest)
				return
			}

			// Validate document type.
			if !validateDocType(srv.Config.DocumentTypes.DocumentType, req.DocType) {
				srv.Logger.Error("invalid document type",
					"method", r.Method,
					"path", r.URL.Path,
					"doc_type", req.DocType,
				)
				http.Error(
					w, "Bad request: invalid document type", http.StatusBadRequest)
				return
			}

			if req.Title == "" {
				srv.Logger.Warn("draft title is required",
					"method", r.Method,
					"path", r.URL.Path,
					"user_email", userEmail)
				http.Error(w, "Bad request: title is required", http.StatusBadRequest)
				return
			}

			// Get doc type template.
			template := getDocTypeTemplate(
				srv.Config.DocumentTypes.DocumentType, req.DocType)
			if template == "" {
				srv.Logger.Error("Bad request: no template configured for doc type",
					"method", r.Method,
					"path", r.URL.Path,
					"doc_type", req.DocType,
				)
				http.Error(w,
					"Bad request: no template configured for doc type",
					http.StatusBadRequest)
				return
			}

			// Build title.
			if req.ProductAbbreviation == "" {
				req.ProductAbbreviation = "TODO"
			}

			// Create a filename based on product and title.
			fileNameBase := fmt.Sprintf("%s-%s", req.ProductAbbreviation, req.Title)

			// Sanitize the filename for SharePoint (remove characters that
			// SharePoint doesn't allow: # % & * : < > ? / \ { | } ~).
			// Google Drive doesn't need this sanitization.
			var sanitizedTitle string
			if srv.SharePoint != nil {
				sanitizedTitle = strings.NewReplacer(
					"[", "(",
					"]", ")",
					"#", "-",
					"%", "-",
					"&", "and",
					"*", "-",
					":", "-",
					"<", "-",
					">", "-",
					"?", "",
					"/", "-",
					"\\", "-",
					"{", "(",
					"|", "-",
					"}", ")",
					"~", "-",
				).Replace(fileNameBase)
				// Add .docx extension for SharePoint.
				sanitizedTitle = fmt.Sprintf("%s.docx", sanitizedTitle)
			} else {
				sanitizedTitle = fileNameBase
			}

			// Log the filename we're going to create.
			srv.Logger.Info("Creating document with filename",
				"filename", sanitizedTitle,
				"method", r.Method,
				"path", r.URL.Path,
				"template", template,
			)

			var (
				err    error
				fileID string
				doc    *document.Document
			)

			if srv.SharePoint != nil {
				// Create draft in SharePoint
				fileDetails, err := srv.SharePoint.CopyFile(
					template,                           // Template ID
					sanitizedTitle,                     // New file name (sanitized for SharePoint)
					srv.Config.SharePoint.DraftsFolder, // Destination folder
				)
				srv.Logger.Debug("File details from SharePoint CopyFile", "details=", fileDetails)
				if err != nil {
					srv.Logger.Error("error copying template to create draft",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"template", template,
					)
					if strings.Contains(err.Error(), "409 Conflict") &&
						strings.Contains(err.Error(), "nameAlreadyExists") {
						srv.Logger.Warn("file with this name already exists",
							"method", r.Method,
							"path", r.URL.Path,
							"user_email", userEmail,
							"title", req.Title)
						http.Error(w, "File with this name already exists. Please change the title.",
							http.StatusConflict)
						return
					}
					http.Error(w, "Error creating document draft",
						http.StatusInternalServerError)
					return
				}

				fileID = fileDetails.ID

				// Build created date.
				createdTime, err := time.Parse(time.RFC3339Nano, fileDetails.LastModified)
				if err != nil {
					srv.Logger.Error("error parsing draft created time",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"doc_id", fileID,
					)
					http.Error(w, "Error creating document draft",
						http.StatusInternalServerError)
					return
				}
				cd := createdTime.Format("Jan 2, 2006")

				srv.Logger.Info("Created draft",
					"file_id", fileID,
					"method", r.Method,
					"path", r.URL.Path,
					"template", template,
					"user", userEmail,
				)

				metaTags := []string{
					"o_id:" + userEmail,
				}

				doc = &document.Document{
					ObjectID:     fileID,
					Title:        req.Title,
					AppCreated:   true,
					Contributors: req.Contributors,
					Created:      cd,
					CreatedTime:  createdTime.Unix(),
					DocNumber:    fmt.Sprintf("%s-???", req.ProductAbbreviation),
					DocType:      req.DocType,
					MetaTags:     metaTags,
					ModifiedTime: createdTime.Unix(),
					Owners:       []string{userEmail},
					OwnerPhotos:  []string{},
					Product:      req.Product,
					Status:       "WIP",
					Summary:      req.Summary,
				}

				// Replace document header with custom properties in SharePoint
				headerProps := map[string]string{
					"Title":        req.Title,
					"DocType":      req.DocType,
					"DocNumber":    fmt.Sprintf("%s-???", req.ProductAbbreviation),
					"Product":      req.Product,
					"Status":       "WIP",
					"Contributors": strings.Join(req.Contributors, ","),
					"Summary":      req.Summary,
					"Created":      createdTime.Format("Jan 2, 2006"),
					"Owner":        userEmail,
					"Approvers":    "N/A",
				}

				err = srv.SharePoint.ReplaceDocumentHeaderWithContentUpdate(fileID, headerProps)
				if err != nil {
					srv.Logger.Error("error replacing document header",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"doc_id", fileID,
					)
					srv.SharePoint.DeleteFile(fileID)
					http.Error(w, "Error occurred during document header update",
						http.StatusInternalServerError)
					return
				}

				if err := createDraftDBAndShare(srv, r, w, doc, fileID, createdTime, req, userEmail); err != nil {
					return
				}
			} else {
				// Create draft in Google Drive.
				var f *drive.File

				// Copy template to new draft file.
				if srv.Config.GoogleWorkspace.Auth != nil &&
					srv.Config.GoogleWorkspace.Auth.CreateDocsAsUser {
					// If configured to create documents as the logged-in Hermes user,
					// create a new Google Drive service to do this.
					ctx := context.Background()
					conf := &jwt.Config{
						Email:      srv.Config.GoogleWorkspace.Auth.ClientEmail,
						PrivateKey: []byte(srv.Config.GoogleWorkspace.Auth.PrivateKey),
						Scopes: []string{
							"https://www.googleapis.com/auth/drive",
						},
						Subject:  userEmail,
						TokenURL: srv.Config.GoogleWorkspace.Auth.TokenURL,
					}
					client := conf.Client(ctx)
					copyTemplateSvc := *srv.GWService
					copyTemplateSvc.Drive, err = drive.NewService(
						ctx, option.WithHTTPClient(client))
					if err != nil {
						srv.Logger.Error("error creating impersonated Google Drive service",
							"error", err,
							"method", r.Method,
							"path", r.URL.Path,
						)
						http.Error(
							w, "Error processing request", http.StatusInternalServerError)
						return
					}

					// Copy template as user to new draft file in temporary drafts folder.
					f, err = copyTemplateSvc.CopyFile(
						template, req.Title, srv.Config.GoogleWorkspace.TemporaryDraftsFolder)
					if err != nil {
						srv.Logger.Error(
							"error copying template as user to temporary drafts folder",
							"error", err,
							"method", r.Method,
							"path", r.URL.Path,
							"template", template,
							"drafts_folder", srv.Config.GoogleWorkspace.DraftsFolder,
							"temporary_drafts_folder", srv.Config.GoogleWorkspace.
								TemporaryDraftsFolder,
							"user", userEmail,
						)
						http.Error(w, "Error creating document draft",
							http.StatusInternalServerError)
						return
					}

					// Move draft file to drafts folder using service user.
					_, err = srv.GWService.MoveFile(
						f.Id, srv.Config.GoogleWorkspace.DraftsFolder)
					if err != nil {
						srv.Logger.Error(
							"error moving draft file to drafts folder",
							"error", err,
							"method", r.Method,
							"path", r.URL.Path,
							"doc_id", f.Id,
							"drafts_folder", srv.Config.GoogleWorkspace.DraftsFolder,
							"temporary_drafts_folder", srv.Config.GoogleWorkspace.
								TemporaryDraftsFolder,
						)
						http.Error(w, "Error creating document draft",
							http.StatusInternalServerError)
						return
					}
				} else {
					// Copy template to new draft file as service user.
					f, err = srv.GWService.CopyFile(
						template, req.Title, srv.Config.GoogleWorkspace.DraftsFolder)
					if err != nil {
						srv.Logger.Error("error creating draft",
							"error", err,
							"method", r.Method,
							"path", r.URL.Path,
							"template", template,
						)
						http.Error(w, "Error creating document draft",
							http.StatusInternalServerError)
						return
					}
				}

				fileID = f.Id

				ct, err := time.Parse(time.RFC3339Nano, f.CreatedTime)
				if err != nil {
					srv.Logger.Error("error parsing draft created time",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"doc_id", fileID,
					)
					http.Error(w, "Error creating document draft",
						http.StatusInternalServerError)
					return
				}
				cd := ct.Format("Jan 2, 2006")

				// Get owner photo by searching Google Workspace directory.
				op := []string{}
				people, err := srv.GWService.SearchPeople(userEmail, "photos")
				if err != nil {
					srv.Logger.Error(
						"error searching directory for person",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"person", userEmail,
					)
				}
				if len(people) > 0 {
					if len(people[0].Photos) > 0 {
						op = append(op, people[0].Photos[0].Url)
					}
				}

				srv.Logger.Info("Created draft",
					"file_id", fileID,
					"method", r.Method,
					"path", r.URL.Path,
					"template", template,
					"user", userEmail,
				)

				metaTags := []string{
					"o_id:" + userEmail,
				}

				doc = &document.Document{
					ObjectID:     fileID,
					Title:        req.Title,
					AppCreated:   true,
					Contributors: req.Contributors,
					Created:      cd,
					CreatedTime:  ct.Unix(),
					DocNumber:    fmt.Sprintf("%s-???", req.ProductAbbreviation),
					DocType:      req.DocType,
					MetaTags:     metaTags,
					ModifiedTime: ct.Unix(),
					Owners:       []string{userEmail},
					OwnerPhotos:  op,
					Product:      req.Product,
					Status:       "WIP",
					Summary:      req.Summary,
				}

				// Replace the doc header using Google Docs API.
				if err = doc.ReplaceHeader(
					srv.Config.BaseURL, true, srv.GWService,
				); err != nil {
					srv.Logger.Error("error replacing draft doc header",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"doc_id", fileID,
					)
					http.Error(w, "Error creating document draft",
						http.StatusInternalServerError)
					return
				}

				if err := createDraftDBAndShare(srv, r, w, doc, fileID, ct, req, userEmail); err != nil {
					return
				}
			} // Write response.
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)

			resp := &DraftsResponse{
				ID: fileID,
			}

			enc := json.NewEncoder(w)
			err = enc.Encode(resp)
			if err != nil {
				srv.Logger.Error("error encoding drafts response",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", fileID,
				)
				http.Error(w, "Error creating document draft",
					http.StatusInternalServerError)
				return
			}

			srv.Logger.Info("created draft",
				"method", r.Method,
				"path", r.URL.Path,
				"doc_id", fileID,
			)

			srv.Logger.Info("ACCESS",
				"user_email", userEmail,
				"doc_id", fileID,
				"operation", "draft_created",
				"updated_attributes", "[docType, product, title]",
				"mode", "draft",
			)

			// Request post-processing.
			go func() {
				// Save document object in Algolia.
				res, err := srv.AlgoWrite.Drafts.SaveObject(doc)
				if err != nil {
					srv.Logger.Error("error saving draft doc in Algolia",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"doc_id", fileID,
					)
					http.Error(w, "Error creating document draft",
						http.StatusInternalServerError)
					return
				}
				err = res.Wait()
				if err != nil {
					srv.Logger.Error("error saving draft doc in Algolia",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"doc_id", fileID,
					)
					http.Error(w, "Error creating document draft",
						http.StatusInternalServerError)
					return
				}

				// Compare Algolia and database documents to find data inconsistencies.
				// Get document object from Algolia.
				var algoDoc map[string]any
				err = srv.AlgoSearch.Drafts.GetObject(fileID, &algoDoc)
				if err != nil {
					srv.Logger.Error("error getting Algolia object for data comparison",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"doc_id", fileID,
					)
					return
				}
				// Get document from database.
				dbDoc := srv.NewDocumentByFileID(fileID)
				if err := dbDoc.Get(srv.DB); err != nil {
					srv.Logger.Error(
						"error getting document from database for data comparison",
						"error", err,
						"path", r.URL.Path,
						"method", r.Method,
						"doc_id", fileID,
					)
					return
				}
				// Get all reviews for the document.
				var reviews models.DocumentReviews
				if err := reviews.Find(srv.DB, models.DocumentReview{
					Document: srv.NewDocumentByFileID(fileID),
				}); err != nil {
					srv.Logger.Error(
						"error getting all reviews for document for data comparison",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"doc_id", fileID,
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
						"doc_id", fileID,
					)
				}
			}()

		case "GET":
			// Get OIDC ID
			id := r.Header.Get("x-amzn-oidc-identity")

			// Parse query
			q := r.URL.Query()
			facetFiltersStr := q.Get("facetFilters")
			facetsStr := q.Get("facets")
			hitsPerPageStr := q.Get("hitsPerPage")
			maxValuesPerFacetStr := q.Get("maxValuesPerFacet")
			pageStr := q.Get("page")

			facetFilters := strings.Split(facetFiltersStr, ",")
			facets := strings.Split(facetsStr, ",")
			hitsPerPage, err := strconv.Atoi(hitsPerPageStr)
			if err != nil {
				srv.Logger.Error("error converting to int",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"hits_per_page", hitsPerPageStr,
				)
				http.Error(w, "Error retrieving document drafts",
					http.StatusInternalServerError)
				return
			}
			maxValuesPerFacet, err := strconv.Atoi(maxValuesPerFacetStr)
			if err != nil {
				srv.Logger.Error("error converting to int",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"max_values_per_facet", maxValuesPerFacetStr,
				)
				http.Error(w, "Error retrieving document drafts",
					http.StatusInternalServerError)
				return
			}
			page, err := strconv.Atoi(pageStr)
			if err != nil {
				srv.Logger.Error("error converting to int",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"page", pageStr,
				)
				http.Error(w, "Error retrieving document drafts",
					http.StatusInternalServerError)
				return
			}

			// Build params
			params := []interface{}{
				opt.Facets(facets...),
				// FacetFilters are supplied as follows:
				// ['attribute1:value', 'attribute2:value'], 'owners:owner_email_value'
				opt.FacetFilterAnd(
					facetFilters,
					opt.FacetFilterOr("owners:"+userEmail, "contributors:"+userEmail),
				),
				opt.HitsPerPage(hitsPerPage),
				opt.MaxValuesPerFacet(maxValuesPerFacet),
				opt.Page(page),
			}

			// Retrieve all documents
			var resp search.QueryRes
			sortBy := q.Get("sortBy")
			if sortBy == "dateAsc" {
				resp, err = srv.AlgoSearch.DraftsCreatedTimeAsc.Search("", params...)
			} else {
				resp, err = srv.AlgoSearch.DraftsCreatedTimeDesc.Search("", params...)
			}
			if err != nil {
				srv.Logger.Error("error retrieving document drafts from Algolia",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
				)
				http.Error(w, "Error retrieving document drafts",
					http.StatusInternalServerError)
				return
			}

			// Write response.
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)

			enc := json.NewEncoder(w)
			err = enc.Encode(resp)
			if err != nil {
				srv.Logger.Error("error encoding document drafts",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
				)
				http.Error(w, "Error requesting document draft",
					http.StatusInternalServerError)
				return
			}

			srv.Logger.Info("retrieved document drafts",
				"method", r.Method,
				"path", r.URL.Path,
				"o_id", id,
			)

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
	})
}

func DraftsDocumentHandler(srv server.Server) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Parse document ID and request type from the URL path.
		docID, reqType, err := parseDocumentsURLPath(
			r.URL.Path, "drafts")
		if err != nil {
			srv.Logger.Error("error parsing drafts URL path",
				"error", err,
				"path", r.URL.Path,
				"method", r.Method,
			)
			http.Error(w, "Bad request", http.StatusBadRequest)
			return
		}

		// Get document from database.
		model := srv.NewDocumentByFileID(docID)
		if err := model.Get(srv.DB); err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				srv.Logger.Warn("document draft record not found",
					"path", r.URL.Path,
					"method", r.Method,
					"doc_id", docID,
				)
				http.Error(w, "Draft not found", http.StatusNotFound)
				return
			} else {
				srv.Logger.Error("error getting document draft from database",
					"error", err,
					"path", r.URL.Path,
					"method", r.Method,
					"doc_id", docID,
				)
				http.Error(w, "Error requesting document draft",
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
			http.Error(w, "Error accessing draft document",
				http.StatusInternalServerError)
			return
		}

		// Make sure document is a draft.
		if doc.Status != "WIP" {
			srv.Logger.Warn("document is not a draft",
				"method", r.Method,
				"path", r.URL.Path,
				"doc_id", docID,
				"status", doc.Status)
			http.Error(w, "Draft not found", http.StatusNotFound)
			return
		}

		// Authorize request (only allow owners or contributors to get past this
		// point in the handler). We further authorize some methods later that
		// require owner access only.
		userEmail := r.Context().Value("userEmail").(string)
		var isOwner, isContributor bool
		if len(doc.Owners) > 0 && strings.EqualFold(doc.Owners[0], userEmail) {
			isOwner = true
		}
		if contains(doc.Contributors, userEmail) {
			isContributor = true
		}
		if !isOwner && !isContributor && !model.ShareableAsDraft {
			srv.Logger.Warn("unauthorized draft access attempt",
				"method", r.Method,
				"path", r.URL.Path,
				"doc_id", docID,
				"user_email", userEmail,
				"is_owner", isOwner,
				"is_contributor", isContributor,
				"shareable_as_draft", model.ShareableAsDraft)
			http.Error(w,
				"Only owners or contributors can access a non-shared draft document",
				http.StatusUnauthorized)
			return
		}

		// Pass request off to associated subcollection (part of the URL after the
		// draft document ID) handler, if appropriate.
		switch reqType {
		case relatedResourcesDocumentSubcollectionRequestType:
			documentsResourceRelatedResourcesHandler(
				w, r, docID, *doc, srv.Config, srv.Logger, srv.AlgoSearch, srv.DB, srv.IsSharePoint())
			return
		case shareableDocumentSubcollectionRequestType:
			draftsShareableHandler(w, r, docID, *doc, *srv.Config, srv.Logger,
				srv.AlgoSearch, srv.GWService, srv.DB, srv.IsSharePoint())
			return
		case archivedDocumentSubcollectionRequestType:
			draftsArchivedHandler(w, r, docID, *doc, *srv.Config, srv.Logger,
				srv.AlgoWrite, srv.DB, srv.IsSharePoint())
			return
		}

		switch r.Method {
		case "HEAD":
			// HEAD: respond with 200, and for SharePoint documents expose
			// the direct edit URL header so the frontend can redirect.
			// For Google documents, return 200 without the header so the
			// frontend falls through to normal in-app document viewing.
			if srv.SharePoint != nil {
				fileDetails, err := srv.SharePoint.GetFileDetails(docID)
				if err != nil {
					srv.Logger.Error("error getting draft file from SharePoint (HEAD)",
						"error", err,
						"path", r.URL.Path,
						"method", r.Method,
						"doc_id", docID,
					)
					http.Error(w, "Error requesting document draft", http.StatusInternalServerError)
					return
				}
				w.Header().Set("X-Direct-Edit-URL", fileDetails.WebURL)
			}

			w.Header().Set("Cache-Control", "private, no-store")
			w.WriteHeader(http.StatusOK)

			// Request post-processing for recently viewed documents
			go func() {
				// Update recently viewed documents if this is a document view event. The
				// Add-To-Recently-Viewed header is set in the request from the frontend
				// to differentiate between document views and requests to only retrieve
				// document metadata.
				if r.Header.Get("Add-To-Recently-Viewed") != "" {
					if err := updateRecentlyViewedDocs(
						userEmail, docID, srv.DB, time.Now(), srv.IsSharePoint(),
					); err != nil {
						srv.Logger.Error("error updating recently viewed docs",
							"error", err,
							"path", r.URL.Path,
							"method", r.Method,
							"doc_id", docID,
						)
					}
				}
			}()
			return
		case "GET":
			now := time.Now()

			var directEditURL string
			if srv.SharePoint != nil {
				// Get file details from SharePoint
				fileDetails, err := srv.SharePoint.GetFileDetails(docID)
				if err != nil {
					srv.Logger.Error("error getting document file from SharePoint",
						"error", err,
						"path", r.URL.Path,
						"method", r.Method,
						"doc_id", docID,
					)
					http.Error(w,
						"Error requesting document draft", http.StatusInternalServerError)
					return
				}

				// Parse modified time from SharePoint
				modifiedTime, err := time.Parse(time.RFC3339, fileDetails.LastModified)
				if err != nil {
					srv.Logger.Error("error parsing modified time",
						"error", err,
						"path", r.URL.Path,
						"method", r.Method,
						"doc_id", docID,
					)
					http.Error(w,
						"Error requesting document draft", http.StatusInternalServerError)
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
						"Error requesting document draft", http.StatusInternalServerError)
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
						"Error requesting document draft", http.StatusInternalServerError)
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
				http.Error(w, "Error getting document draft",
					http.StatusInternalServerError)
				return
			}

			docObj["directEditURL"] = directEditURL // Add direct edit URL

			// Write response.
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)

			enc := json.NewEncoder(w)
			err = enc.Encode(docObj)
			if err != nil {
				srv.Logger.Error("error encoding document draft",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID,
				)
				http.Error(w, "Error requesting document draft",
					http.StatusInternalServerError)
				return
			}

			srv.Logger.Info("retrieved document draft",
				"method", r.Method,
				"path", r.URL.Path,
				"doc_id", docID,
			)

			// Request post-processing.
			go func() {
				// Update recently viewed documents if this is a document view event. The
				// Add-To-Recently-Viewed header is set in the request from the frontend
				// to differentiate between document views and requests to only retrieve
				// document metadata.
				if r.Header.Get("Add-To-Recently-Viewed") != "" {
					if err := updateRecentlyViewedDocs(
						userEmail, docID, srv.DB, now, srv.IsSharePoint(),
					); err != nil {
						srv.Logger.Error("error updating recently viewed docs",
							"error", err,
							"path", r.URL.Path,
							"method", r.Method,
							"doc_id", docID,
						)
					}
				}

				// Compare Algolia and database documents to find data inconsistencies.
				// Get document object from Algolia.
				var algoDoc map[string]any
				err = srv.AlgoSearch.Drafts.GetObject(docID, &algoDoc)
				if err != nil {
					// Only warn because we might be in the process of saving the Algolia
					// object for a new draft.
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

		case "DELETE":
			// Authorize request.
			if !isOwner {
				srv.Logger.Warn("unauthorized draft deletion attempt",
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID,
					"user_email", userEmail)
				http.Error(w,
					"Only owners can delete a draft document",
					http.StatusUnauthorized)
				return
			}

			if srv.SharePoint != nil {
				if err := srv.SharePoint.DeleteFile(docID); err != nil {
					srv.Logger.Error("error deleting document from SharePoint",
						"error", err,
						"path", r.URL.Path,
						"method", r.Method,
						"doc_id", docID,
					)
					http.Error(w, "Error deleting document draft",
						http.StatusInternalServerError)
					return
				}
			} else {
				if err := srv.GWService.DeleteFile(docID); err != nil {
					srv.Logger.Error("error deleting document file",
						"error", err,
						"path", r.URL.Path,
						"method", r.Method,
						"doc_id", docID,
					)
					http.Error(w, "Error deleting document draft",
						http.StatusInternalServerError)
					return
				}
			}

			// Delete object in Algolia.
			res, err := srv.AlgoWrite.Drafts.DeleteObject(docID)
			if err != nil {
				srv.Logger.Error(
					"error deleting document draft from Algolia",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID,
				)
				http.Error(w, "Error deleting document draft",
					http.StatusInternalServerError)
				return
			}
			err = res.Wait()
			if err != nil {
				srv.Logger.Error(
					"error deleting document draft from Algolia",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID,
				)
				http.Error(w, "Error deleting document draft",
					http.StatusInternalServerError)
				return
			}

			// Delete document in the database.
			d := srv.NewDocumentByFileID(docID)
			if err := d.Delete(srv.DB); err != nil {
				srv.Logger.Error(
					"error deleting document draft in database",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID,
				)
				http.Error(w, "Error deleting document draft",
					http.StatusInternalServerError)
				return
			}

			resp := &DraftsResponse{
				ID: docID,
			}

			// Write response.
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)

			enc := json.NewEncoder(w)
			err = enc.Encode(resp)
			if err != nil {
				srv.Logger.Error(
					"error encoding response",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID,
				)
				http.Error(w, "Error deleting document draft",
					http.StatusInternalServerError)
				return
			}

		case "PATCH":
			// Authorize request.
			if !isOwner {
				srv.Logger.Warn("unauthorized draft patch attempt",
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID,
					"user_email", userEmail)
				http.Error(w,
					"Only owners can patch a draft document",
					http.StatusForbidden)
				return
			}

			// Decode request. The request struct validates that the request only
			// contains fields that are allowed to be patched.
			var req DraftsPatchRequest
			if err := decodeRequest(r, &req); err != nil {
				srv.Logger.Error("error decoding draft patch request", "error", err)
				http.Error(w, fmt.Sprintf("Bad request: %q", err),
					http.StatusBadRequest)
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

			// Validate product if it is in the patch request.
			var productAbbreviation string
			if req.Product != nil && *req.Product != "" {
				p := models.Product{Name: *req.Product}
				if err := p.Get(srv.DB); err != nil {
					srv.Logger.Error("error getting product",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"product", req.Product,
						"doc_id", docID)
					http.Error(w, "Bad request: invalid product",
						http.StatusBadRequest)
					return
				}

				// Set product abbreviation because we use this later to update the
				// doc number in the Algolia object.
				productAbbreviation = p.Abbreviation
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

			// Check if document is locked (Google-only).
			if !srv.IsSharePoint() {
				locked, err := hcd.IsLocked(docID, srv.DB, srv.GWService, srv.Logger)
				if err != nil {
					srv.Logger.Error("error checking document locked status",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
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

			// Compare contributors in request and stored object in Algolia
			// before we save the patched objected
			// Find out contributors to share the document with
			var contributorsToAddSharing []string
			var contributorsToRemoveSharing []string
			if req.Contributors != nil {
				if len(doc.Contributors) == 0 && len(*req.Contributors) != 0 {
					// If there are no contributors of the document
					// add the contributors in the request
					contributorsToAddSharing = *req.Contributors
				} else if len(*req.Contributors) != 0 {
					// Only compare when there are stored contributors
					// and contributors in the request
					contributorsToAddSharing = compareSlices(
						doc.Contributors, *req.Contributors)
				}
				// Find out contributors to remove from sharing the document
				// var contributorsToRemoveSharing []string
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
			}

			// Share file with contributors.
			// Google Drive API limitation is that you can only share files with one
			// user at a time.

			if len(contributorsToAddSharing) > 0 {
				if srv.SharePoint != nil {
					if err := srv.SharePoint.ShareFileWithMultipleUsers(docID, "writer", contributorsToAddSharing); err != nil {
						srv.Logger.Error("error sharing file with the contributor",
							"error", err,
							"method", r.Method,
							"path", r.URL.Path,
							"doc_id", docID,
							"contributor", contributorsToAddSharing)
						http.Error(w, "Error patching document draft",
							http.StatusInternalServerError)
						return
					}
				} else {
					for _, c := range contributorsToAddSharing {
						if err := srv.GWService.ShareFile(docID, c, "writer"); err != nil {
							srv.Logger.Error("error sharing file with the contributor",
								"error", err,
								"method", r.Method,
								"path", r.URL.Path,
								"doc_id", docID,
								"contributor", c)
							http.Error(w, "Error patching document draft",
								http.StatusInternalServerError)
							return
						}
					}
				}
				srv.Logger.Info("shared document with contributors",
					"method", r.Method,
					"path", r.URL.Path,
					"contributors_count", len(contributorsToAddSharing),
				)

				docURL := fmt.Sprintf("%s/document/%s?draft=true", srv.Config.BaseURL, docID)

				srv.Logger.Info("contributor email queued",
					"doc_id", docID,
					"contributor_count", len(contributorsToAddSharing),
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
								DocumentType:      doc.DocType,
								DocumentStatus:    doc.Status,
								DocumentURL:       docURL,
								Product:           doc.Product,
							},
							contributorsToAddSharing,
							srv.Config.Email.FromAddress,
							srv.GetEmailSender(),
						)
					},
					docID,
					"contributor_added",
					r,
				)
			}
			// Build permission map for contributor removal.
			emailToPermissionIDsMap := make(map[string][]string)
			if srv.SharePoint != nil {
				permissions, err := srv.SharePoint.ListPermissions(docID)
				if err != nil {
					srv.Logger.Error("error getting file permissions",
						"error", err,
						"path", r.URL.Path,
						"method", r.Method,
						"doc_id", docID,
					)
					http.Error(w,
						"Error requesting document draft", http.StatusInternalServerError)
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
					srv.Logger.Error("error getting file permissions",
						"error", err,
						"path", r.URL.Path,
						"method", r.Method,
						"doc_id", docID,
					)
					http.Error(w,
						"Error requesting document draft", http.StatusInternalServerError)
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
						http.Error(w, "Error patching document draft",
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

			// Approvers.
			if req.Approvers != nil {
				doc.Approvers = *req.Approvers

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
				doc.ApproverGroups = *req.ApproverGroups

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
				doc.Contributors = *req.Contributors

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
				srv.Logger.Info("processing custom fields",
					"doc_id", docID,
					"custom_fields_count", len(*req.CustomFields))

				for _, cf := range *req.CustomFields {

					switch cf.Type {
					case "STRING":
						if v, ok := cf.Value.(string); ok {
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
							http.Error(w,
								fmt.Sprintf(
									"Bad request: invalid value type for custom field %q",
									cf.Name,
								),
								http.StatusBadRequest)
							return
						}
					case "PEOPLE":
						srv.Logger.Info("processing PEOPLE custom field",
							"cf_name", cf.Name,
							"cf_type", cf.Type,
							"doc_id", docID)

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
								http.Error(w,
									fmt.Sprintf(
										"Bad request: invalid value type for custom field %q",
										cf.Name,
									),
									http.StatusBadRequest)
								return
							}
						}

						// IMPORTANT: Query database for old stakeholders BEFORE any modifications
						var oldStakeholders []string
						if strings.EqualFold(cf.Name, "stakeholders") || strings.EqualFold(cf.DisplayName, "Stakeholders") {
							srv.Logger.Info("querying database for old stakeholders",
								"cf_name", cf.Name,
								"doc_id", docID)

							// Query the document's current custom fields directly from database
							var dbDoc models.Document
							err := srv.DB.
								Preload("CustomFields.DocumentTypeCustomField").
								Where("id = ?", model.ID).
								First(&dbDoc).Error

							if err == nil {
								// Find the stakeholders custom field in the database result
								for _, existingCF := range dbDoc.CustomFields {
									if existingCF.DocumentTypeCustomField.Name == "Stakeholders" {
										// Parse the JSON value from database
										var stakeholderEmails []string
										if err := json.Unmarshal([]byte(existingCF.Value), &stakeholderEmails); err == nil {
											oldStakeholders = stakeholderEmails
											srv.Logger.Info("found old stakeholders from database",
												"old_stakeholders_count", len(oldStakeholders),
												"doc_id", docID)
										} else {
											srv.Logger.Warn("failed to unmarshal old stakeholders",
												"error", err,
												"doc_id", docID,
												"field_name", existingCF.DocumentTypeCustomField.Name)
										}
										break
									}
								}
							} else {
								srv.Logger.Warn("failed to query database for old stakeholders",
									"error", err,
									"doc_id", docID)
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
							http.Error(w,
								fmt.Sprintf(
									"Bad request: invalid value type for custom field %q",
									cf.Name,
								),
								http.StatusBadRequest)
							return
						}

						// Send email notification for new stakeholders
						srv.Logger.Info("checking custom field for stakeholder email",
							"cf_name", cf.Name,
							"doc_id", docID)

						if strings.EqualFold(cf.Name, "stakeholders") || strings.EqualFold(cf.DisplayName, "Stakeholders") {
							// Expand groups recursively for both old and new stakeholders
							oldStakeholdersExpanded, err := expandStakeholderGroups(oldStakeholders, srv)
							if err != nil {
								srv.Logger.Error("error expanding old stakeholder groups",
									"error", err,
									"doc_id", docID)
								// Continue with unexpanded list if expansion fails
								oldStakeholdersExpanded = oldStakeholders
							}

							newStakeholdersExpanded, err := expandStakeholderGroups(cfVal, srv)
							if err != nil {
								srv.Logger.Error("error expanding new stakeholder groups",
									"error", err,
									"doc_id", docID)
								// Continue with unexpanded list if expansion fails
								newStakeholdersExpanded = cfVal
							}

							// Find new stakeholders (those in expanded new list but not in expanded old list)
							newStakeholders := compareSlices(oldStakeholdersExpanded, newStakeholdersExpanded)

							srv.Logger.Debug("stakeholder change detected",
								"doc_id", docID,
								"new_count", len(newStakeholders))

							if len(newStakeholders) > 0 {
								// Build document URL
								docURL := fmt.Sprintf("%s/document/%s?draft=true", srv.Config.BaseURL, docID)

								srv.Logger.Info("sending stakeholder notification email",
									"doc_id", docID,
									"recipient_count", len(newStakeholders))

								// Send email to new stakeholders asynchronously
								go func() {
									helpers.SendEmailWithRetry(
										&srv,
										func() error {
											err := email.SendStakeholderAddedEmail(
												email.StakeholderAddedEmailData{
													BaseURL:           srv.Config.BaseURL,
													DocumentOwner:     doc.Owners[0],
													DocumentShortName: doc.DocNumber,
													DocumentTitle:     doc.Title,
													DocumentType:      doc.DocType,
													DocumentStatus:    doc.Status,
													DocumentURL:       docURL,
													Product:           doc.Product,
												},
												newStakeholders,
												srv.Config.Email.FromAddress,
												srv.GetEmailSender(),
											)

											if err != nil {
												srv.Logger.Error("SendStakeholderAddedEmail failed",
													"error", err,
													"doc_id", docID,
													"recipients", newStakeholders)
												return err
											}

											srv.Logger.Info("SendStakeholderAddedEmail succeeded",
												"doc_id", docID,
												"recipients", newStakeholders)
											return nil
										},
										docID,
										"stakeholder_added",
										r,
									)

									srv.Logger.Info("stakeholder email send complete",
										"doc_id", docID)
								}()
							}
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

			// Make sure all custom fields in the database model have the document ID.
			for _, cf := range model.CustomFields {
				cf.DocumentID = model.ID
			}

			// Document modified time.
			model.DocumentModifiedAt = time.Unix(doc.ModifiedTime, 0)

			// Owner.
			if req.Owners != nil {
				doc.Owners = *req.Owners
				model.Owner = &models.User{
					EmailAddress: doc.Owners[0],
				}

				// Share file with new owner.
				if srv.SharePoint != nil {
					if err := srv.SharePoint.ShareFile(docID, doc.Owners[0], "writer"); err != nil {
						srv.Logger.Error("error sharing file with new owner",
							"error", err,
							"method", r.Method,
							"path", r.URL.Path,
							"doc_id", docID,
							"new_owner", doc.Owners[0])
						http.Error(w, "Error patching document draft",
							http.StatusInternalServerError)
						return
					}
				} else {
					if err := srv.GWService.ShareFile(docID, doc.Owners[0], "writer"); err != nil {
						srv.Logger.Error("error sharing file with new owner",
							"error", err,
							"method", r.Method,
							"path", r.URL.Path,
							"doc_id", docID,
							"new_owner", doc.Owners[0])
						http.Error(w, "Error patching document draft",
							http.StatusInternalServerError)
						return
					}
				}
			}

			// Product.
			if req.Product != nil {
				doc.Product = *req.Product
				model.Product = models.Product{Name: *req.Product}

				// Remove product ID so it gets updated during upsert (or else it will
				// override the product name).
				model.ProductID = 0

				// Update doc number in document.
				doc.DocNumber = fmt.Sprintf("%s-???", productAbbreviation)
			}

			// Summary.
			if req.Summary != nil {
				doc.Summary = *req.Summary
				model.Summary = req.Summary
			}

			// Title.
			if req.Title != nil {
				doc.Title = *req.Title
				model.Title = *req.Title

				// Rename the file to match the new title.
				// Extract the product abbreviation from DocNumber (e.g., "HCP-???" -> "HCP").
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
				}

				var renameErr error
				if srv.SharePoint != nil {
					renameErr = srv.SharePoint.RenameFile(docID, newFileName)
				} else {
					renameErr = srv.GWService.RenameFile(docID, newFileName)
				}
				if renameErr != nil {
					srv.Logger.Error("error renaming file",
						"error", renameErr,
						"method", r.Method,
						"path", r.URL.Path,
						"doc_id", docID,
						"new_file_name", newFileName)
					// Non-fatal: continue even if rename fails
					srv.Logger.Warn("continuing draft patch despite file rename failure")
				} else {
					srv.Logger.Info("successfully renamed file",
						"method", r.Method,
						"path", r.URL.Path,
						"doc_id", docID,
						"new_file_name", newFileName)
				}
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
					http.Error(w, "Error updating document draft",
						http.StatusInternalServerError)
					return
				}

				// Get name of new document owner.
				newOwner := email.User{
					EmailAddress: doc.Owners[0],
				}
				// Get name of old document owner.
				oldOwner := email.User{
					EmailAddress: userEmail,
				}

				if srv.SharePoint != nil {
					// Look up display names via Microsoft Graph.
					newPerson, err := srv.SharePoint.GetPersonByEmail(doc.Owners[0])
					if err != nil {
						srv.Logger.Warn("error looking up new owner in Microsoft Graph",
							"error", err,
							"method", r.Method,
							"path", r.URL.Path,
							"doc_id", docID,
							"person", doc.Owners[0],
						)
					} else {
						newOwner.Name = newPerson.DisplayName
					}

					oldPerson, err := srv.SharePoint.GetPersonByEmail(userEmail)
					if err != nil {
						srv.Logger.Warn("error looking up old owner in Microsoft Graph",
							"error", err,
							"method", r.Method,
							"path", r.URL.Path,
							"doc_id", docID,
							"person", userEmail,
						)
					} else {
						oldOwner.Name = oldPerson.DisplayName
					}
				} else {
					// Look up display names via Google Workspace directory.
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

					ppl, err = srv.GWService.SearchPeople(
						userEmail, "emailAddresses,names")
					if err != nil {
						srv.Logger.Warn("error searching directory for old owner",
							"error", err,
							"method", r.Method,
							"path", r.URL.Path,
							"doc_id", docID,
							"person", userEmail,
						)
					}
					if len(ppl) == 1 && ppl[0].Names != nil {
						oldOwner.Name = ppl[0].Names[0].DisplayName
					}
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
					srv.GetEmailSender(),
				); err != nil {
					srv.Logger.Error("error sending new owner email",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"doc_id", docID,
					)
					http.Error(w, "Error updating document draft",
						http.StatusInternalServerError)
					return
				}
			}

			// Update document in the database.
			if err := model.Upsert(srv.DB); err != nil {
				srv.Logger.Error("error updating document in the database",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID,
				)
				http.Error(w, "Error updating document draft",
					http.StatusInternalServerError)
				return
			}

			// Replace the doc header (Google-only; SharePoint headers
			// are managed by the Hermes Add-In for Word).
			if !srv.IsSharePoint() {
				if err := doc.ReplaceHeader(
					srv.Config.BaseURL, true, srv.GWService,
				); err != nil {
					srv.Logger.Error("error replacing draft doc header",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"doc_id", docID,
					)
					http.Error(w, "Error replacing header of document draft",
						http.StatusInternalServerError)
					return
				}
			}

			w.WriteHeader(http.StatusOK)

			srv.Logger.Info("patched draft document",
				"method", r.Method,
				"path", r.URL.Path,
				"doc_id", docID,
			)

			// Log document access with Datadog ACCESS tag
			operation, updatedAttrs := buildDraftOperation(req)
			srv.Logger.Info("ACCESS",
				"user_email", userEmail,
				"doc_id", docID,
				"operation", operation,
				"updated_attributes", updatedAttrs,
				"mode", "draft",
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

				// Save new modified draft doc object in Algolia.
				res, err := srv.AlgoWrite.Drafts.SaveObject(docObj)
				if err != nil {
					srv.Logger.Error("error saving patched draft doc in Algolia",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"doc_id", docID,
					)
					return
				}
				err = res.Wait()
				if err != nil {
					srv.Logger.Error("error saving patched draft doc in Algolia",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"doc_id", docID,
					)
					return
				}

				// Compare Algolia and database documents to find data inconsistencies.
				// Get document object from Algolia.
				var algoDoc map[string]any
				err = srv.AlgoSearch.Drafts.GetObject(docID, &algoDoc)
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

// getDocTypeTemplate returns the file ID of the template for a specified
// document type or an empty string if not found.
func getDocTypeTemplate(
	docTypes []*config.DocumentType,
	docType string,
) string {
	template := ""

	for _, t := range docTypes {
		if t.Name == docType {
			template = t.Template
			break
		}
	}

	return template
}

// validateDocType returns true if the name (docType) is contained in the a
// slice of configured document types.
func validateDocType(
	docTypes []*config.DocumentType,
	docType string,
) bool {
	for _, t := range docTypes {
		if t.Name == docType {
			return true
		}
	}

	return false
}

// TODO : Need to validate users permission for people not part of the Hermes Sharepoint Group. (Contributors/Approvers) Contributors validated, Need to check Approvers.

// createDraftDBAndShare creates the database record and shares the draft with
// the owner and contributors. It writes HTTP errors to the ResponseWriter and
// returns a non-nil error if the caller should return early.
func createDraftDBAndShare(
	srv server.Server, r *http.Request, w http.ResponseWriter,
	doc *document.Document, fileID string, createdTime time.Time,
	req DraftsRequest, userEmail string,
) error {
	// Create document in the database.
	var contributors []*models.User
	for _, c := range req.Contributors {
		contributors = append(contributors, &models.User{
			EmailAddress: c,
		})
	}

	docByFileID := srv.NewDocumentByFileID(fileID)
	model := models.Document{
		GoogleFileID:       docByFileID.GoogleFileID,
		FileID:             docByFileID.FileID,
		Contributors:       contributors,
		DocumentCreatedAt:  createdTime,
		DocumentModifiedAt: createdTime,
		DocumentType: models.DocumentType{
			Name: req.DocType,
		},
		Owner: &models.User{
			EmailAddress: userEmail,
		},
		Product: models.Product{
			Name: req.Product,
		},
		Status:  models.WIPDocumentStatus,
		Summary: &req.Summary,
		Title:   req.Title,
	}
	if err := model.Create(srv.DB); err != nil {
		srv.Logger.Error("error creating document in database",
			"error", err,
			"method", r.Method,
			"path", r.URL.Path,
			"doc_id", fileID,
		)
		http.Error(w, "Error creating document draft",
			http.StatusInternalServerError)
		return err
	}

	// Share the document with the owner.
	if srv.SharePoint != nil {
		if err := srv.SharePoint.ShareFile(fileID, userEmail, "writer"); err != nil {
			srv.Logger.Error("error sharing file with owner",
				"error", err,
				"method", r.Method,
				"path", r.URL.Path,
				"doc_id", fileID,
				"owner", userEmail,
			)
			srv.Logger.Warn("continuing document creation despite sharing failure with owner")
		}
	} else {
		if err := srv.GWService.ShareFile(fileID, userEmail, "writer"); err != nil {
			srv.Logger.Error("error sharing file with owner",
				"error", err,
				"method", r.Method,
				"path", r.URL.Path,
				"doc_id", fileID,
				"owner", userEmail,
			)
			srv.Logger.Warn("continuing document creation despite sharing failure with owner")
		}
	}

	// Share the document with contributors.
	contributorsToEmail := []string{}
	for _, contributor := range req.Contributors {
		if strings.EqualFold(contributor, userEmail) {
			continue
		}

		var shareErr error
		if srv.SharePoint != nil {
			shareErr = srv.SharePoint.ShareFile(fileID, contributor, "writer")
		} else {
			shareErr = srv.GWService.ShareFile(fileID, contributor, "writer")
		}
		if shareErr != nil {
			srv.Logger.Error("error sharing file with contributor",
				"error", shareErr,
				"method", r.Method,
				"path", r.URL.Path,
				"doc_id", fileID,
				"contributor", contributor,
			)
			srv.Logger.Warn("continuing document creation despite sharing failure with contributor")
		} else {
			contributorsToEmail = append(contributorsToEmail, contributor)
		}
	}

	if len(contributorsToEmail) > 0 {
		docURL := fmt.Sprintf("%s/document/%s?draft=true", srv.Config.BaseURL, fileID)

		srv.Logger.Info("contributor email queued",
			"doc_id", fileID,
			"contributor_count", len(contributorsToEmail),
			"method", r.Method,
			"path", r.URL.Path,
		)

		go helpers.SendEmailWithRetry(
			&srv,
			func() error {
				return email.SendContributorAddedEmail(
					email.ContributorAddedEmailData{
						BaseURL:           srv.Config.BaseURL,
						DocumentOwner:     userEmail,
						DocumentShortName: fmt.Sprintf("%s-???", req.ProductAbbreviation),
						DocumentTitle:     req.Title,
						DocumentType:      req.DocType,
						DocumentStatus:    "WIP",
						DocumentURL:       docURL,
						Product:           req.Product,
					},
					contributorsToEmail,
					srv.Config.Email.FromAddress,
					srv.GetEmailSender(),
				)
			},
			fileID,
			"contributor_added",
			r,
		)
	}

	return nil
}

// removeSharing handles permission removal for documents.
// It uses the pre-built emailToPermissionIDMap to find and delete permissions.
func removeSharing(srv server.Server, docID, email string, emailToPermissionIDMap map[string][]string) error {
	if permissionIDs, exists := emailToPermissionIDMap[email]; exists {
		// Remove all permissions associated with the email.
		for _, pid := range permissionIDs {
			if srv.SharePoint != nil {
				if err := srv.SharePoint.DeletePermission(docID, pid); err != nil {
					return fmt.Errorf("error removing permission ID %s for email %s: %w", pid, email, err)
				}
			} else {
				if err := srv.GWService.DeletePermission(docID, pid); err != nil {
					return fmt.Errorf("error removing permission ID %s for email %s: %w", pid, email, err)
				}
			}
		}
	}

	return nil
}

// buildDraftOperation determines the primary operation and builds a list of updated attributes
// from a DraftsPatchRequest for logging purposes.
func buildDraftOperation(req DraftsPatchRequest) (string, string) {
	var attrs []string
	var operation string

	// Determine primary operation based on what's being changed
	if req.Owners != nil {
		operation = "ownership_transferred"
		attrs = append(attrs, "owners")
	}
	if req.Product != nil {
		if operation == "" {
			operation = "product_changed"
		}
		attrs = append(attrs, "product")
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
		operation = "draft_updated"
	}

	// If multiple fields updated, mark as bulk update
	if len(attrs) > 1 {
		operation = "draft_bulk_update"
	}

	var attrsList string
	if len(attrs) == 0 {
		attrsList = "none"
	} else {
		attrsList = fmt.Sprintf("[%s]", strings.Join(attrs, ", "))
	}

	return operation, attrsList
}
