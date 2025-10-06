package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"reflect"
	"strconv"
	"strings"
	"time"

	pkgauth "github.com/hashicorp-forge/hermes/pkg/auth"

	"github.com/algolia/algoliasearch-client-go/v3/algolia/errs"
	"github.com/algolia/algoliasearch-client-go/v3/algolia/opt"
	"github.com/algolia/algoliasearch-client-go/v3/algolia/search"
	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/pkg/algolia"
	"github.com/hashicorp-forge/hermes/pkg/document"
	hcd "github.com/hashicorp-forge/hermes/pkg/hashicorpdocs"
	"github.com/hashicorp-forge/hermes/pkg/models"
	gw "github.com/hashicorp-forge/hermes/pkg/workspace/adapters/google"
	"github.com/hashicorp/go-hclog"
	"golang.org/x/oauth2/jwt"
	"google.golang.org/api/drive/v3"
	"google.golang.org/api/option"
	"gorm.io/gorm"
)

type DraftsRequest struct {
	Approvers           []string `json:"approvers,omitempty"`
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
	Approvers    *[]string               `json:"approvers,omitempty"`
	Contributors *[]string               `json:"contributors,omitempty"`
	CustomFields *[]document.CustomField `json:"customFields,omitempty"`
	Product      *string                 `json:"product,omitempty"`
	Summary      *string                 `json:"summary,omitempty"`
	// Tags                []string `json:"tags,omitempty"`
	Title *string `json:"title,omitempty"`
}

type DraftsResponse struct {
	ID string `json:"id"`
}

func DraftsHandler(
	cfg *config.Config,
	l hclog.Logger,
	ar *algolia.Client,
	aw *algolia.Client,
	s *gw.Service,
	db *gorm.DB) http.Handler {

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		errResp := func(httpCode int, userErrMsg, logErrMsg string, err error) {
			l.Error(logErrMsg,
				"method", r.Method,
				"path", r.URL.Path,
				"error", err,
			)
			http.Error(w, userErrMsg, httpCode)
		}

		// Authorize request.
		userEmail := pkgauth.MustGetUserEmail(r.Context())
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
				l.Error("error decoding drafts request", "error", err)
				http.Error(w, fmt.Sprintf("Bad request: %q", err),
					http.StatusBadRequest)
				return
			}

			// Validate document type.
			if !validateDocType(cfg.DocumentTypes.DocumentType, req.DocType) {
				l.Error("invalid document type",
					"method", r.Method,
					"path", r.URL.Path,
					"doc_type", req.DocType,
				)
				http.Error(
					w, "Bad request: invalid document type", http.StatusBadRequest)
				return
			}

			if req.Title == "" {
				http.Error(w, "Bad request: title is required", http.StatusBadRequest)
				return
			}

			// Get doc type template.
			template := getDocTypeTemplate(cfg.DocumentTypes.DocumentType, req.DocType)
			if template == "" {
				l.Error("Bad request: no template configured for doc type", "doc_type", req.DocType)
				http.Error(w,
					"Bad request: no template configured for doc type",
					http.StatusBadRequest)
				return
			}

			// Build title.
			if req.ProductAbbreviation == "" {
				req.ProductAbbreviation = "TODO"
			}
			title := fmt.Sprintf("[%s-???] %s", req.ProductAbbreviation, req.Title)

			var (
				err error
				f   *drive.File
			)

			// Copy template to new draft file.
			if cfg.GoogleWorkspace.Auth != nil &&
				cfg.GoogleWorkspace.Auth.CreateDocsAsUser {
				// If configured to create documents as the logged-in Hermes user,
				// create a new Google Drive service to do this.
				ctx := context.Background()
				conf := &jwt.Config{
					Email:      cfg.GoogleWorkspace.Auth.ClientEmail,
					PrivateKey: []byte(cfg.GoogleWorkspace.Auth.PrivateKey),
					Scopes: []string{
						"https://www.googleapis.com/auth/drive",
					},
					Subject:  userEmail,
					TokenURL: cfg.GoogleWorkspace.Auth.TokenURL,
				}
				client := conf.Client(ctx)
				copyTemplateSvc := *s
				copyTemplateSvc.Drive, err = drive.NewService(
					ctx, option.WithHTTPClient(client))
				if err != nil {
					l.Error("error creating impersonated Google Drive service",
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
					template, title, cfg.GoogleWorkspace.TemporaryDraftsFolder)
				if err != nil {
					l.Error(
						"error copying template as user to temporary drafts folder",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"template", template,
						"drafts_folder", cfg.GoogleWorkspace.DraftsFolder,
						"temporary_drafts_folder", cfg.GoogleWorkspace.
							TemporaryDraftsFolder,
					)
					http.Error(w, "Error creating document draft",
						http.StatusInternalServerError)
					return
				}

				// Move draft file to drafts folder using service user.
				_, err = s.MoveFile(
					f.Id, cfg.GoogleWorkspace.DraftsFolder)
				if err != nil {
					l.Error(
						"error moving draft file to drafts folder",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"doc_id", f.Id,
						"drafts_folder", cfg.GoogleWorkspace.DraftsFolder,
						"temporary_drafts_folder", cfg.GoogleWorkspace.
							TemporaryDraftsFolder,
					)
					http.Error(w, "Error creating document draft",
						http.StatusInternalServerError)
					return
				}
			} else {
				// Copy template to new draft file as service user.
				f, err = s.CopyFile(
					template, title, cfg.GoogleWorkspace.DraftsFolder)
				if err != nil {
					l.Error("error creating draft",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"template", template,
						"drafts_folder", cfg.GoogleWorkspace.DraftsFolder,
					)
					http.Error(w, "Error creating document draft",
						http.StatusInternalServerError)
					return
				}
			}

			// Build created date.
			ct, err := time.Parse(time.RFC3339Nano, f.CreatedTime)
			if err != nil {
				l.Error("error parsing draft created time", "error", err, "doc_id", f.Id)
				http.Error(w, "Error creating document draft",
					http.StatusInternalServerError)
				return
			}
			cd := ct.Format("Jan 2, 2006")

			// Get owner photo by searching Google Workspace directory.
			op := []string{}
			people, err := s.SearchPeople(userEmail, "photos")
			if err != nil {
				l.Error(
					"error searching directory for person",
					"err", err,
					"person", userEmail,
				)
			}
			if len(people) > 0 {
				if len(people[0].Photos) > 0 {
					op = append(op, people[0].Photos[0].Url)
				}
			}

			// Create tag
			// Note: The o_id tag may be empty for environments such as development.
			// For environments like pre-prod and prod, it will be set as
			// Okta authentication is enforced before this handler is called for
			// those environments. Maybe, if id isn't set we use
			// owner emails in the future?
			id := r.Header.Get("x-amzn-oidc-identity")
			metaTags := []string{
				"o_id:" + id,
			}

			// Build document.
			doc := &document.Document{
				ObjectID:     f.Id,
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
				Tags:         req.Tags,
			}

			res, err := aw.Drafts.SaveObject(doc)
			if err != nil {
				l.Error("error saving draft doc in Algolia", "error", err, "doc_id", f.Id)
				http.Error(w, "Error creating document draft",
					http.StatusInternalServerError)
				return
			}
			err = res.Wait()
			if err != nil {
				l.Error("error saving draft doc in Algolia", "error", err, "doc_id", f.Id)
				http.Error(w, "Error creating document draft",
					http.StatusInternalServerError)
				return
			}

			// Replace the doc header.
			provider := gw.NewAdapter(s)
			if err = doc.ReplaceHeader(cfg.BaseURL, true, provider); err != nil {
				l.Error("error replacing draft doc header",
					"error", err, "doc_id", f.Id)
				http.Error(w, "Error creating document draft",
					http.StatusInternalServerError)
				return
			}

			// Create document in the database.
			var approvers []*models.User
			for _, c := range req.Approvers {
				approvers = append(approvers, &models.User{
					EmailAddress: c,
				})
			}
			var contributors []*models.User
			for _, c := range req.Contributors {
				contributors = append(contributors, &models.User{
					EmailAddress: c,
				})
			}
			createdTime, err := time.Parse(time.RFC3339Nano, f.CreatedTime)
			if err != nil {
				l.Error("error parsing document created time",
					"error", err, "doc_id", f.Id)
				http.Error(w, "Error creating document draft",
					http.StatusInternalServerError)
				return
			}
			model := models.Document{
				GoogleFileID:       f.Id,
				Approvers:          approvers,
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
			if err := model.Create(db); err != nil {
				l.Error("error creating document in database",
					"error", err,
					"doc_id", f.Id,
				)
				http.Error(w, "Error creating document draft",
					http.StatusInternalServerError)
				return
			}

			// Share file with the owner
			if err := s.ShareFile(f.Id, userEmail, "writer"); err != nil {
				l.Error("error sharing file with the owner",
					"error", err, "doc_id", f.Id)
				http.Error(w, "Error creating document draft",
					http.StatusInternalServerError)
				return
			}

			// Share file with contributors.
			// Google Drive API limitation
			// is that you can only share files
			// with one user at a time
			for _, c := range req.Contributors {
				if err := s.ShareFile(f.Id, c, "writer"); err != nil {
					l.Error("error sharing file with the contributor",
						"error", err, "doc_id", f.Id, "contributor", c)
					http.Error(w, "Error creating document draft",
						http.StatusInternalServerError)
					return
				}
			}

			// TODO: Delete draft file in the case of an error.

			// Write response.
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)

			resp := &DraftsResponse{
				ID: f.Id,
			}

			enc := json.NewEncoder(w)
			err = enc.Encode(resp)
			if err != nil {
				l.Error("error encoding drafts response", "error", err, "doc_id", f.Id)
				http.Error(w, "Error creating document draft",
					http.StatusInternalServerError)
				return
			}

			l.Info("created draft", "doc_id", f.Id)

			// Compare Algolia and database documents to find data inconsistencies.
			// Get document object from Algolia.
			var algoDoc map[string]any
			err = ar.Drafts.GetObject(f.Id, &algoDoc)
			if err != nil {
				l.Error("error getting Algolia object for data comparison",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", f.Id,
				)
				return
			}
			// Get document from database.
			dbDoc := models.Document{
				GoogleFileID: f.Id,
			}
			if err := dbDoc.Get(db); err != nil {
				l.Error("error getting document from database for data comparison",
					"error", err,
					"path", r.URL.Path,
					"method", r.Method,
					"doc_id", f.Id,
				)
				return
			}
			// Get all reviews for the document.
			var reviews models.DocumentReviews
			if err := reviews.Find(db, models.DocumentReview{
				Document: models.Document{
					GoogleFileID: f.Id,
				},
			}); err != nil {
				l.Error("error getting all reviews for document for data comparison",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", f.Id,
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
					"doc_id", f.Id,
				)
			}

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
				l.Error("error converting to int", "error", err, "hits_per_page", hitsPerPageStr)
				http.Error(w, "Error retrieving document drafts",
					http.StatusInternalServerError)
				return
			}
			maxValuesPerFacet, err := strconv.Atoi(maxValuesPerFacetStr)
			if err != nil {
				l.Error("error converting to int", "error", err, "max_values_per_facet", maxValuesPerFacetStr)
				http.Error(w, "Error retrieving document drafts",
					http.StatusInternalServerError)
				return
			}
			page, err := strconv.Atoi(pageStr)
			if err != nil {
				l.Error("error converting to int", "error", err, "page", pageStr)
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
				resp, err = ar.DraftsCreatedTimeAsc.Search("", params...)
			} else {
				resp, err = ar.DraftsCreatedTimeDesc.Search("", params...)
			}
			if err != nil {
				l.Error("error retrieving document drafts from Algolia", "error", err)
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
				l.Error("error encoding document drafts", "error", err)
				http.Error(w, "Error requesting document draft",
					http.StatusInternalServerError)
				return
			}

			l.Info("retrieved document drafts", "o_id", id)

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
	})
}

func DraftsDocumentHandler(
	cfg *config.Config,
	l hclog.Logger,
	ar *algolia.Client,
	aw *algolia.Client,
	s *gw.Service,
	db *gorm.DB) http.Handler {

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Parse document ID and request type from the URL path.
		docId, reqType, err := parseDocumentsURLPath(
			r.URL.Path, "drafts")
		if err != nil {
			l.Error("error parsing drafts URL path",
				"error", err,
				"path", r.URL.Path,
				"method", r.Method,
			)
			http.Error(w, "Bad request", http.StatusBadRequest)
			return
		}

		// Get document object from Algolia.
		var algoObj map[string]any
		err = ar.Drafts.GetObject(docId, &algoObj)
		if err != nil {
			// Handle 404 from Algolia and only log a warning.
			if _, is404 := errs.IsAlgoliaErrWithCode(err, 404); is404 {
				l.Warn("document object not found in Algolia",
					"error", err,
					"path", r.URL.Path,
					"method", r.Method,
					"doc_id", docId,
				)
				http.Error(w, "Draft document not found", http.StatusNotFound)
				return
			} else {
				l.Error("error requesting document draft from Algolia",
					"error", err,
					"doc_id", docId,
				)
				http.Error(w, "Error accessing draft document",
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
				"doc_id", docId,
			)
			http.Error(w, "Error accessing draft document",
				http.StatusInternalServerError)
			return
		}

		// Get document from database.
		model := models.Document{
			GoogleFileID: docId,
		}
		if err := model.Get(db); err != nil {
			l.Error("error getting document draft from database",
				"error", err,
				"path", r.URL.Path,
				"method", r.Method,
				"doc_id", docId,
			)
			http.Error(w, "Error requesting document draft",
				http.StatusInternalServerError)
			return
		}

		// Authorize request (only allow owners or contributors to get past this
		// point in the handler). We further authorize some methods later that
		// require owner access only.
		userEmail := pkgauth.MustGetUserEmail(r.Context())
		var isOwner, isContributor bool
		if doc.Owners[0] == userEmail {
			isOwner = true
		}
		if contains(doc.Contributors, userEmail) {
			isContributor = true
		}
		if !isOwner && !isContributor && !model.ShareableAsDraft {
			http.Error(w,
				"Only owners or contributors can access a non-shared draft document",
				http.StatusUnauthorized)
			return
		}

		// Pass request off to associated subcollection (part of the URL after the
		// draft document ID) handler, if appropriate.
		switch reqType {
		case relatedResourcesDocumentSubcollectionRequestType:
			documentsResourceRelatedResourcesHandler(w, r, docId, *doc, cfg, l, ar, db)
			return
		case shareableDocumentSubcollectionRequestType:
			draftsShareableHandler(w, r, docId, *doc, *cfg, l, ar, s, db)
			return
		}

		switch r.Method {
		case "GET":
			now := time.Now()

			// Get file from Google Drive so we can return the latest modified time.
			file, err := s.GetFile(docId)
			if err != nil {
				l.Error("error getting document file from Google",
					"error", err,
					"path", r.URL.Path,
					"method", r.Method,
					"doc_id", docId,
				)
				http.Error(w, "Error requesting document draft", http.StatusInternalServerError)
				return
			}

			// Parse and set modified time.
			modifiedTime, err := time.Parse(time.RFC3339Nano, file.ModifiedTime)
			if err != nil {
				l.Error("error parsing modified time",
					"error", err,
					"path", r.URL.Path,
					"method", r.Method,
					"doc_id", docId,
				)
				http.Error(w, "Error requesting document draft", http.StatusInternalServerError)
				return
			}
			doc.ModifiedTime = modifiedTime.Unix()

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
					"doc_id", docId,
				)
				http.Error(w, "Error getting document draft",
					http.StatusInternalServerError)
				return
			}

			// Write response.
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)

			enc := json.NewEncoder(w)
			err = enc.Encode(docObj)
			if err != nil {
				l.Error("error encoding document draft", "error", err, "doc_id", docId)
				http.Error(w, "Error requesting document draft",
					http.StatusInternalServerError)
				return
			}

			// Update recently viewed documents if this is a document view event. The
			// Add-To-Recently-Viewed header is set in the request from the frontend
			// to differentiate between document views and requests to only retrieve
			// document metadata.
			if r.Header.Get("Add-To-Recently-Viewed") != "" {
				if err := updateRecentlyViewedDocs(userEmail, docId, db, now); err != nil {
					// If we get an error, log it but don't return an error response because
					// this would degrade UX.
					l.Error("error updating recently viewed docs",
						"error", err,
						"path", r.URL.Path,
						"method", r.Method,
						"doc_id", docId,
					)
				}
			}

			l.Info("retrieved document draft", "doc_id", docId)

			// Compare Algolia and database documents to find data inconsistencies.
			// Get document object from Algolia.
			var algoDoc map[string]any
			err = ar.Drafts.GetObject(docId, &algoDoc)
			if err != nil {
				l.Error("error getting Algolia object for data comparison",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docId,
				)
				return
			}
			// Get document from database.
			dbDoc := models.Document{
				GoogleFileID: docId,
			}
			if err := dbDoc.Get(db); err != nil {
				l.Error("error getting document from database for data comparison",
					"error", err,
					"path", r.URL.Path,
					"method", r.Method,
					"doc_id", docId,
				)
				return
			}
			// Get all reviews for the document.
			var reviews models.DocumentReviews
			if err := reviews.Find(db, models.DocumentReview{
				Document: models.Document{
					GoogleFileID: docId,
				},
			}); err != nil {
				l.Error("error getting all reviews for document for data comparison",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docId,
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
					"doc_id", docId,
				)
			}

		case "DELETE":
			// Authorize request.
			if !isOwner {
				http.Error(w,
					"Only owners can delete a draft document",
					http.StatusUnauthorized)
				return
			}

			// Delete document in Google Drive.
			err = s.DeleteFile(docId)
			if err != nil {
				l.Error("error deleting document", "error", err, "doc_id", docId)
				http.Error(w, "Error deleting document draft",
					http.StatusInternalServerError)
				return
			}

			// Delete object in Algolia
			res, err := aw.Drafts.DeleteObject(docId)
			if err != nil {
				l.Error("error deleting document draft from algolia",
					"error", err,
					"doc_id", docId,
				)
				http.Error(w, "Error deleting document draft",
					http.StatusInternalServerError)
				return
			}
			err = res.Wait()
			if err != nil {
				l.Error("error deleting document draft from algolia",
					"error", err,
					"doc_id", docId,
				)
				http.Error(w, "Error deleting document draft",
					http.StatusInternalServerError)
				return
			}

			// Delete document in the database.
			d := models.Document{
				GoogleFileID: docId,
			}
			if err := d.Delete(db); err != nil {
				l.Error("error deleting document in database",
					"error", err,
					"doc_id", docId,
				)
				// Don't return an HTTP error because the database isn't the source of
				// truth yet.
			}

			resp := &DraftsResponse{
				ID: docId,
			}

			// Write response.
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)

			enc := json.NewEncoder(w)
			err = enc.Encode(resp)
			if err != nil {
				l.Error("error encoding document id", "error", err, "doc_id", docId)
				http.Error(w, "Error deleting document draft",
					http.StatusInternalServerError)
				return
			}

		case "PATCH":
			// Decode request. The request struct validates that the request only
			// contains fields that are allowed to be patched.
			var req DraftsPatchRequest
			if err := decodeRequest(r, &req); err != nil {
				l.Error("error decoding draft patch request", "error", err)
				http.Error(w, fmt.Sprintf("Bad request: %q", err),
					http.StatusBadRequest)
				return
			}

			// Validate product if it is in the patch request.
			var productAbbreviation string
			if req.Product != nil && *req.Product != "" {
				p := models.Product{Name: *req.Product}
				if err := p.Get(db); err != nil {
					l.Error("error getting product",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"product", req.Product,
						"doc_id", docId)
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
						l.Error("custom field not found",
							"error", err,
							"method", r.Method,
							"path", r.URL.Path,
							"custom_field", cf.Name,
							"doc_id", docId)
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
							"doc_id", docId)
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
							"doc_id", docId)
						http.Error(w, "Bad request: invalid custom field type",
							http.StatusBadRequest)
						return
					}
				}
			}

			// Check if document is locked.
			provider := gw.NewAdapter(s)
			locked, err := hcd.IsLocked(docId, db, provider, l)
			if err != nil {
				l.Error("error checking document locked status",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docId,
				)
				http.Error(w, "Error getting document status", http.StatusNotFound)
				return
			}
			// Don't continue if document is locked.
			if locked {
				http.Error(w, "Document is locked", http.StatusLocked)
				return
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
					contributorsToAddSharing = compareSlices(doc.Contributors, *req.Contributors)
				}
				// Find out contributors to remove from sharing the document
				// var contributorsToRemoveSharing []string
				// TODO: figure out how we want to handle user removing all contributors
				// from the sidebar select
				if len(doc.Contributors) != 0 && len(*req.Contributors) != 0 {
					// Compare contributors when there are stored contributors
					// and there are contributors in the request
					contributorsToRemoveSharing = compareSlices(*req.Contributors, doc.Contributors)
				}
			}

			// Share file with contributors.
			// Google Drive API limitation
			// is that you can only share files
			// with one user at a time
			for _, c := range contributorsToAddSharing {
				if err := s.ShareFile(docId, c, "writer"); err != nil {
					l.Error("error sharing file with the contributor",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"doc_id", docId,
						"contributor", c)
					http.Error(w, "Error patching document draft",
						http.StatusInternalServerError)
					return
				}
			}
			if len(contributorsToAddSharing) > 0 {
				l.Info("shared document with contributors",
					"contributors_count", len(contributorsToAddSharing))
			}

			// Remove contributors from file.
			// This unfortunately needs to be done one user at a time
			for _, c := range contributorsToRemoveSharing {
				// Only remove contributor if the email
				// associated with the permission doesn't
				// match owner email(s).
				if !contains(doc.Owners, c) {
					if err := removeSharing(s, docId, c); err != nil {
						l.Error("error removing contributor from file",
							"error", err,
							"method", r.Method,
							"path", r.URL.Path,
							"doc_id", docId,
							"contributor", c)
						http.Error(w, "Error patching document draft",
							http.StatusInternalServerError)
						return
					}
				}
			}
			if len(contributorsToRemoveSharing) > 0 {
				l.Info("removed contributors from document",
					"contributors_count", len(contributorsToRemoveSharing))
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
				for _, cf := range *req.CustomFields {
					switch cf.Type {
					case "STRING":
						if v, ok := cf.Value.(string); ok {
							if err := doc.UpsertCustomField(cf); err != nil {
								l.Error("error upserting custom string field",
									"error", err,
									"method", r.Method,
									"path", r.URL.Path,
									"custom_field", cf.Name,
									"doc_id", docId,
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
							l.Error("invalid value type for string custom field",
								"error", err,
								"method", r.Method,
								"path", r.URL.Path,
								"custom_field", cf.Name,
								"doc_id", docId)
							http.Error(w,
								fmt.Sprintf(
									"Bad request: invalid value type for custom field %q",
									cf.Name,
								),
								http.StatusBadRequest)
							return
						}
					case "PEOPLE":
						if reflect.TypeOf(cf.Value).Kind() != reflect.Slice {
							l.Error("invalid value type for people custom field",
								"error", err,
								"method", r.Method,
								"path", r.URL.Path,
								"custom_field", cf.Name,
								"doc_id", docId)
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
								l.Error("invalid value type for people custom field",
									"error", err,
									"method", r.Method,
									"path", r.URL.Path,
									"custom_field", cf.Name,
									"doc_id", docId)
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
								"doc_id", docId,
							)
							http.Error(w,
								"Error patching document",
								http.StatusInternalServerError)
							return
						}

						model.CustomFields, err = models.UpsertStringSliceDocumentCustomField(
							model.CustomFields,
							doc.DocType,
							cf.DisplayName,
							cfVal,
						)
						if err != nil {
							l.Error("invalid value type for people custom field",
								"error", err,
								"method", r.Method,
								"path", r.URL.Path,
								"custom_field", cf.Name,
								"doc_id", docId)
							http.Error(w,
								fmt.Sprintf(
									"Bad request: invalid value type for custom field %q",
									cf.Name,
								),
								http.StatusBadRequest)
							return
						}
					default:
						l.Error("invalid custom field type",
							"error", err,
							"method", r.Method,
							"path", r.URL.Path,
							"custom_field", cf.Name,
							"custom_field_type", cf.Type,
							"doc_id", docId)
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
			}

			// Update document in the database.
			if err := model.Upsert(db); err != nil {
				l.Error("error updating document in the database",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docId,
				)
				// Don't return an HTTP error because the database isn't the source of
				// truth yet.
			}
			// }

			// Convert document to Algolia object.
			docObj, err := doc.ToAlgoliaObject(true)
			if err != nil {
				l.Error("error converting document to Algolia object",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docId,
				)
				http.Error(w, "Error patching document draft",
					http.StatusInternalServerError)
				return
			}

			// Save new modified draft doc object in Algolia.
			res, err := aw.Drafts.SaveObject(docObj)
			if err != nil {
				l.Error("error saving patched draft doc in Algolia", "error", err,
					"doc_id", docId)
				http.Error(w, "Error creating document draft",
					http.StatusInternalServerError)
				return
			}
			err = res.Wait()
			if err != nil {
				l.Error("error saving patched draft doc in Algolia", "error", err,
					"doc_id", docId)
				http.Error(w, "Error creating document draft",
					http.StatusInternalServerError)
				return
			}

			// Replace the doc header.
			provider = gw.NewAdapter(s)
			if err := doc.ReplaceHeader(cfg.BaseURL, true, provider); err != nil {
				l.Error("error replacing draft doc header",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docId,
				)
				http.Error(w, "Error replacing header of document draft",
					http.StatusInternalServerError)
				return
			}

			// Rename file with new title.
			s.RenameFile(docId,
				fmt.Sprintf("[%s] %s", doc.DocNumber, doc.Title))

			w.WriteHeader(http.StatusOK)
			l.Info("patched draft document",
				"method", r.Method,
				"path", r.URL.Path,
				"doc_id", docId,
			)

			// Compare Algolia and database documents to find data inconsistencies.
			// Get document object from Algolia.
			var algoDoc map[string]any
			err = ar.Drafts.GetObject(docId, &algoDoc)
			if err != nil {
				l.Error("error getting Algolia object for data comparison",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docId,
				)
				return
			}
			// Get document from database.
			dbDoc := models.Document{
				GoogleFileID: docId,
			}
			if err := dbDoc.Get(db); err != nil {
				l.Error("error getting document from database for data comparison",
					"error", err,
					"path", r.URL.Path,
					"method", r.Method,
					"doc_id", docId,
				)
				return
			}
			// Get all reviews for the document.
			var reviews models.DocumentReviews
			if err := reviews.Find(db, models.DocumentReview{
				Document: models.Document{
					GoogleFileID: docId,
				},
			}); err != nil {
				l.Error("error getting all reviews for document for data comparison",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docId,
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
					"doc_id", docId,
				)
			}

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
	})
}

// validateID validates the whether the ID matches
// the ID tag in the Algolia document object
func validateID(id string, tags []string) error {
	// draft document should have tags set
	// in order to verify the document
	// was created by a particular id
	if len(tags) == 0 {
		return fmt.Errorf("tags cannot be empty")
	}
	for _, j := range tags {
		if strings.Contains(j, "o_id:") {
			// Prevent user requesting a document draft that
			// wasn't created by them.
			if j != "o_id:"+id {
				return fmt.Errorf("oidc id didn't match the id tag on the document")
			}
		} else {
			return fmt.Errorf("o_id tag wasn't set in the object")
		}
	}

	return nil
}

// parseURLPath parses the URL path with format "{prefix}/{resource_id}"
// (e.g., "/api/v1/drafts/{document_id}") and returns a
// resource ID
// TODO: make more extensible using regexp package and move to helpers.go.
func parseURLPath(path, prefix string) (string, error) {
	// Remove prefix (like "/api/v1/drafts") from URL path
	path = strings.TrimPrefix(path, prefix)

	// Remove empty entries and validate path
	urlPath := strings.Split(path, "/")
	var resultPath []string
	for _, v := range urlPath {
		// Only append non-empty values, this remove
		// any empty strings in the slice
		if v != "" {
			resultPath = append(resultPath, v)
		}
	}
	resultPathLen := len(resultPath)
	// Only allow 1 value to be set in the
	// resultPath slice. For example,
	// if the urlPath is set to /{document_id}
	// then the resultPath slice would be ["{document_id}"]
	if resultPathLen > 1 {
		return "", fmt.Errorf("invalid url path")
	}
	// If there are no entries in the resultPath
	// slice, then there was no document ID set in
	// URL path. Return an empty string
	if resultPathLen == 0 {
		return "", fmt.Errorf("no document id set in url path")
	}

	// return document ID
	return resultPath[0], nil
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

// removeSharing lists permissions for a document and then
// deletes the permission for the supplied user email
func removeSharing(s *gw.Service, docId, email string) error {
	permissions, err := s.ListPermissions(docId)
	if err != nil {
		return err
	}
	for _, p := range permissions {
		if p.EmailAddress == email {
			return s.DeletePermission(docId, p.Id)
		}
	}
	return nil
}
