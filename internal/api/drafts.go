package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/hashicorp-forge/hermes/internal/email"
	slackbot "github.com/hashicorp-forge/hermes/internal/slack-bot"

	"github.com/algolia/algoliasearch-client-go/v3/algolia/errs"
	"github.com/algolia/algoliasearch-client-go/v3/algolia/opt"
	"github.com/algolia/algoliasearch-client-go/v3/algolia/search"
	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/pkg/algolia"
	gw "github.com/hashicorp-forge/hermes/pkg/googleworkspace"
	hcd "github.com/hashicorp-forge/hermes/pkg/hashicorpdocs"
	"github.com/hashicorp-forge/hermes/pkg/models"
	"github.com/hashicorp/go-hclog"
	"gorm.io/gorm"
)

type DraftsRequest struct {
	Reviewers    []string `json:"reviewers,omitempty"`
	DueDate      string   `json:"dueDate,omitempty"`
	Contributors []string `json:"contributors,omitempty"`
	DocType      string   `json:"docType,omitempty"`
	Product      string   `json:"product,omitempty"`
	Team         string   `json:"team,omitempty"`
	Project      string   `json:"project,omitempty"`
	Summary      string   `json:"summary,omitempty"`
	Tags         []string `json:"tags,omitempty"`
	Title        string   `json:"title"`
}

// DraftsPatchRequest contains a subset of drafts fields that are allowed to
// be updated with a PATCH request.
type DraftsPatchRequest struct {
	Reviewers    []string `json:"reviewers,omitempty"`
	DueDate      string   `json:"dueDate,omitempty"`
	Contributors []string `json:"contributors,omitempty"`
	Product      string   `json:"product,omitempty"`
	Team         string   `json:"team,omitempty"`
	Project      string   `json:"project,omitempty"`
	Summary      string   `json:"summary,omitempty"`
	// Tags                []string `json:"tags,omitempty"`
	Title string `json:"title,omitempty"`

	// TODO: These are all current custom editable fields for all supported doc
	// types. We should instead make this dynamic.
	CurrentVersion string   `json:"currentVersion,omitempty"`
	PRD            string   `json:"prd,omitempty"`
	PRFAQ          string   `json:"prfaq,omitempty"`
	RFC            string   `json:"rfc,omitempty"`
	Stakeholders   []string `json:"stakeholders,omitempty"`
	TargetVersion  string   `json:"targetVersion,omitempty"`
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
				l.Error("error decoding drafts request", "error", err)
				http.Error(w, fmt.Sprintf("Bad request: %q", err),
					http.StatusBadRequest)
				return
			}
			// Define a variable to hold the retrieved document type array
			var doctypeArray []template = GetDocTypeArray(*cfg)
			// replace switch case with loop
			check := true
			for i := 0; i < len(doctypeArray); i++ {
				if doctypeArray[i].TemplateName == req.DocType {
					check = false
					break
				}
			}
			if check {
				l.Error("Bad request: docType is required", "doc_type", req.DocType)
				http.Error(w, "Bad request: invalid docType", http.StatusBadRequest)
				return
			}

			if req.Title == "" {
				http.Error(w, "Bad request: title is required", http.StatusBadRequest)
				return
			}

			// Get doc type template new.
			templateName := getDocTypeTemplate(doctypeArray, req.DocType)
			if templateName == "" {
				l.Error("Bad request: no templateName configured for doc type", "doc_type", req.DocType)
				http.Error(w,
					"Bad request: no templateName configured for doc type",
					http.StatusBadRequest)
				return
			}

			// Build title.

			title := fmt.Sprintf("%s", req.Title)

			// Copy template to new draft file.
			f, err := s.CopyFile(templateName, title, cfg.GoogleWorkspace.DraftsFolder)
			if err != nil {
				l.Error("error creating draft", "error", err, "template name ", templateName,
					"drafts_folder", cfg.GoogleWorkspace.DraftsFolder)
				http.Error(w, "Error creating document draft",
					http.StatusInternalServerError)
				return
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

			// a object of base doc
			baseDocObj := &hcd.BaseDoc{
				ObjectID:     f.Id,
				Title:        req.Title,
				AppCreated:   true,
				Contributors: req.Contributors,
				Created:      cd,
				CreatedTime:  ct.Unix(),
				DocType:      req.DocType,
				MetaTags:     metaTags,
				Owners:       []string{userEmail},
				OwnerPhotos:  op,
				Product:      req.Product,
				Team:         req.Team,
				Project:      req.Project,
				Status:       "Draft",
				Summary:      req.Summary,
				Tags:         req.Tags,
			}

			res, err := aw.Drafts.SaveObject(baseDocObj)
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

			// Create new document object of the proper doc type.
			docObj, err := hcd.NewEmptyDoc(baseDocObj.DocType)
			if err != nil {
				l.Error("error creating new empty doc",
					"error", err,
					"doc_id", f.Id,
				)
				http.Error(w, "Error accessing draft document",
					http.StatusInternalServerError)
				return
			}

			// Get document object from Algolia.
			err = ar.Drafts.GetObject(f.Id, &docObj)
			if err != nil {
				l.Error("error requesting document draft from Algolia",
					"error", err,
					"doc_id", f.Id,
				)
				http.Error(w, "Error accessing draft document",
					http.StatusInternalServerError)
				return
			}

			// archieved
			// Replace the doc header.
			// err = docObj.ReplaceHeader(
			// 	f.Id, cfg.BaseURL, true, s)
			// if err != nil {
			// 	l.Error("error replacing draft doc header",
			// 		"error", err, "doc_id", f.Id)
			// 	http.Error(w, "Error creating document draft",
			// 		http.StatusInternalServerError)
			// 	return
			// }

			// Create document in the database.
			var reviewers []*models.User
			for _, c := range req.Reviewers {
				reviewers = append(reviewers, &models.User{
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
			// TODO: add custom fields.
			d := models.Document{
				GoogleFileID:       f.Id,
				Reviewers:          reviewers,
				DueDate:            req.DueDate,
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
				Team: models.Team{
					Name: req.Team,
				},
				Project: models.Project{
					Name: req.Project,
				},
				Status:  models.DraftDocumentStatus,
				Summary: req.Summary,
				Title:   req.Title,
			}
			if err := d.Create(db); err != nil {
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

			// Send emails to contributors.
			// Get owner name
			// Fetch owner name by searching Google Workspace directory.
			// The api has a bug please kindly see this before proceeding forward
			ppl, err := s.SearchPeople(userEmail, "emailAddresses,names")
			if err != nil {
				errResp(
					http.StatusInternalServerError,
					"Error getting user information",
					"error searching people directory",
					err,
				)
				return
			}

			// Verify that the result only contains one person.
			if len(ppl) != 1 {
				errResp(
					http.StatusInternalServerError,
					"Error getting user information",
					fmt.Sprintf(
						"wrong number of people in search result: %d", len(ppl)),
					err,
				)
				return
			}
			p := ppl[0]

			// Replace the names in the People API result with data from the Admin
			// Directory API.
			// TODO: remove this when the bug in the People API is fixed:
			// https://issuetracker.google.com/issues/196235775
			if err := replaceNamesWithAdminAPIResponse(
				p, s,
			); err != nil {
				errResp(
					http.StatusInternalServerError,
					"Error getting user information",
					"error replacing names with Admin API response",
					err,
				)
				return
			}

			// Verify other required values are set.
			if len(p.Names) == 0 {
				errResp(
					http.StatusInternalServerError,
					"Error getting user information",
					"no names in result",
					err,
				)
				return
			}

			// Send emails, if enabled.
			if cfg.Email != nil && cfg.Email.Enabled {
				docURL, err := getDocumentURL(cfg.BaseURL, docObj.GetObjectID())
				if err != nil {
					l.Error("error getting document URL",
						"error", err,
						"doc_id", docObj.GetObjectID(),
						"method", r.Method,
						"path", r.URL.Path,
					)
					http.Error(w, "Error creating review",
						http.StatusInternalServerError)
					return
				}

				if len(req.Contributors) > 0 {
					// TODO: use an asynchronous method for sending emails because we
					// can't currently recover gracefully from a failure here.
					for _, c := range req.Contributors {
						err := email.SendContributorRequestedEmail(
							email.ContributorRequestedEmailData{
								BaseURL:            cfg.BaseURL,
								DocumentOwner:      p.Names[0].DisplayName,
								DocumentOwnerEmail: docObj.GetOwners()[0],
								DocumentType:       docObj.GetDocType(),
								DocumentTitle:      docObj.GetTitle(),
								DocumentURL:        fmt.Sprintf("%s?draft=true", docURL),
								DocumentProd:       docObj.GetProduct(),
								DocumentTeam:       docObj.GetTeam(),
							},
							[]string{c},
							cfg.Email.FromAddress,
							s,
						)
						if err != nil {
							l.Error("error sending contributors email",
								"error", err,
								"doc_id", docObj.GetObjectID(),
								"method", r.Method,
								"path", r.URL.Path,
							)
							http.Error(w, "Error creating review",
								http.StatusInternalServerError)
							return
						}
						l.Info("doc contributors email sent",
							"doc_id", docObj.GetObjectID(),
							"method", r.Method,
							"path", r.URL.Path,
						)
					}

					// Also send the slack message tagginhg all the contributors in the
					// dedicated channel
					// extracting all contributors emails
					emails := make([]string, len(req.Contributors))
					for i, c := range req.Contributors {
						emails[i] = c
					}
					err = slackbot.SendSlackMessage_Contributor(slackbot.ContributorInvitationSlackData{
						BaseURL:            cfg.BaseURL,
						DocumentOwner:      p.Names[0].DisplayName,
						DocumentOwnerEmail: docObj.GetOwners()[0],
						DocumentType:       docObj.GetDocType(),
						DocumentTitle:      docObj.GetTitle(),
						DocumentURL:        fmt.Sprintf("%s?draft=true", docURL),
						DocumentProd:       docObj.GetProduct(),
						DocumentTeam:       docObj.GetTeam(),
					}, emails,
					)
					//handle error gracefully
					if err != nil {
						fmt.Printf("Some error occured while sendind the message: %s", err)
					} else {
						fmt.Println("Succesfully! Delivered the EMAIL AND SLACK messageS to all contributors")
					}
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
		// Get document ID from URL path
		docId, err := parseURLPath(r.URL.Path, "/api/v1/drafts")
		if err != nil {
			l.Error("error requesting document draft from algolia",
				"error", err,
				"path", r.URL.Path,
			)
			http.Error(w, "Error requesting document draft", http.StatusInternalServerError)
			return
		}

		// Get base document object from Algolia so we can determine the doc type.
		baseDocObj := &hcd.BaseDoc{}
		err = ar.Drafts.GetObject(docId, &baseDocObj)
		if err != nil {
			// Handle 404 from Algolia and only log a warning.
			if _, is404 := errs.IsAlgoliaErrWithCode(err, 404); is404 {
				l.Warn("base document object not found",
					"error", err,
					"path", r.URL.Path,
					"method", r.Method,
					"doc_id", docId,
				)
				http.Error(w, "Draft document not found", http.StatusNotFound)
				return
			} else {
				l.Error("error requesting base document object from Algolia",
					"error", err,
					"path", r.URL.Path,
					"method", r.Method,
					"doc_id", docId,
				)
				http.Error(w, "Error accessing draft document",
					http.StatusInternalServerError)
				return
			}
		}

		// Create new document object of the proper doc type.
		docObj, err := hcd.NewEmptyDoc(baseDocObj.DocType)
		if err != nil {
			l.Error("error creating new empty doc",
				"error", err,
				"doc_id", docId,
			)
			http.Error(w, "Error accessing draft document",
				http.StatusInternalServerError)
			return
		}

		// Get document object from Algolia.
		err = ar.Drafts.GetObject(docId, &docObj)
		if err != nil {
			l.Error("error requesting document draft from Algolia",
				"error", err,
				"doc_id", docId,
			)
			http.Error(w, "Error accessing draft document",
				http.StatusInternalServerError)
			return
		}

		// Authorize request (only allow owners or contributors to get past this
		// point in the handler). We further authorize some methods later that
		// require owner access only.
		userEmail := r.Context().Value("userEmail").(string)
		var isOwner, isContributor bool
		if docObj.GetOwners()[0] == userEmail {
			isOwner = true
		}
		if contains(docObj.GetContributors(), userEmail) {
			isContributor = true
		}
		if !isOwner && !isContributor {
			http.Error(w,
				"Only owners or contributors can access a draft document",
				http.StatusUnauthorized)
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
			docObj.SetModifiedTime(modifiedTime.Unix())

			// Set custom editable fields.
			docObj.SetCustomEditableFields()

			// Get document from database.
			doc := models.Document{
				GoogleFileID: docId,
			}
			if err := doc.Get(db); err != nil {
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

			// Set locked value for response to value from the database (this value
			// isn't stored in Algolia).
			docObj.SetLocked(doc.Locked)

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
					// TODO: change this log back to an error when this handles incomplete
					// data in the database.
					l.Warn("error updating recently viewed docs",
						"error", err,
						"path", r.URL.Path,
						"method", r.Method,
						"doc_id", docId,
					)
					return
				}
			}

			l.Info("retrieved document draft", "doc_id", docId)

		case "DELETE":
			// Authorize request.
			if !isOwner {
				http.Error(w,
					"Only owners can delete a draft document",
					http.StatusUnauthorized)
				return
			}

			// Delete document
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
			// Copy request body so we can use both for validation using the request
			// struct, and then afterwards for patching the document JSON.
			buf, err := ioutil.ReadAll(r.Body)
			if err != nil {
				l.Error("error reading request body",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docId)
				http.Error(w, "Error patching document draft",
					http.StatusInternalServerError)
				return
			}
			body := ioutil.NopCloser(bytes.NewBuffer(buf))
			newBody := ioutil.NopCloser(bytes.NewBuffer(buf))
			r.Body = newBody

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
			if req.Product != "" {
				p := models.Product{Name: req.Product}
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

			}

			// Validate product if it is in the patch request.
			if req.Team != "" {
				p := models.Team{Name: req.Team}
				if err := p.Get(db); err != nil {
					l.Error("error getting team",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"team", req.Team,
						"doc_id", docId)
					http.Error(w, "Bad request: invalid product",
						http.StatusBadRequest)
					return
				}
			}

			// Check if document is locked.
			locked, err := hcd.IsLocked(docId, db, s, l)
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
			if len(docObj.GetContributors()) == 0 && len(req.Contributors) != 0 {
				// If there are no contributors of the document
				// add the contributors in the request
				contributorsToAddSharing = req.Contributors
			} else if len(req.Contributors) != 0 {
				// Only compare when there are stored contributors
				// and contributors in the request
				contributorsToAddSharing = compareSlices(docObj.GetContributors(), req.Contributors)
			}
			// Find out contributors to remove from sharing the document
			var contributorsToRemoveSharing []string
			// TODO: figure out how we want to handle user removing all contributors
			// from the sidebar select
			if len(docObj.GetContributors()) != 0 && len(req.Contributors) != 0 {
				// Compare contributors when there are stored contributors
				// and there are contributors in the request
				contributorsToRemoveSharing = compareSlices(req.Contributors, docObj.GetContributors())
			}

			// Patch document by decoding the (now validated) request body JSON to the
			// document object.
			err = json.NewDecoder(body).Decode(docObj)
			if err != nil {
				l.Error("error decoding request body to document object",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docId)
				http.Error(w, "Error patching document draft",
					http.StatusInternalServerError)
				return
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
				if !contains(docObj.GetOwners(), c) {
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

			// Update product (if it is in the patch request).
			if req.Product != "" {
				// Update in database.
				d := models.Document{
					GoogleFileID: docId,
					Product:      models.Product{Name: req.Product},
				}
				if err := d.Upsert(db); err != nil {
					l.Error("error upserting document to update product",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"product", req.Product,
						"doc_id", docId)
					http.Error(w, "Error patching document draft",
						http.StatusInternalServerError)
					return
				}
			}

			// Update team (if it is in the patch request).
			if req.Team != "" {
				// Update in database.
				d := models.Document{
					GoogleFileID: docId,
					Team:         models.Team{Name: req.Team},
				}
				if err := d.Upsert(db); err != nil {
					l.Error("error upserting document to update team",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"team", req.Team,
						"doc_id", docId)
					http.Error(w, "Error patching document draft",
						http.StatusInternalServerError)
					return
				}

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
			err = docObj.ReplaceHeader(
				docId, cfg.BaseURL, true, s)
			if err != nil {
				l.Error("error replacing draft doc header",
					"error", err, "doc_id", docId)
				http.Error(w, "Error patching document draft",
					http.StatusInternalServerError)
				return
			}

			// Rename file with new title.
			s.RenameFile(docId,
				fmt.Sprintf(req.Title))

			w.WriteHeader(http.StatusOK)
			l.Info("patched draft document", "doc_id", docId)

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
// document type or an empty string if not found. new
func getDocTypeTemplate(
	docTypes []template,
	docType string,
) string {
	docId := ""

	for _, t := range docTypes {
		if strings.ToUpper(t.TemplateName) == strings.ToUpper(docType) {
			docId = t.DocId
			break
		}
	}

	return docId
}

// // document type or an empty string if not found. old
// func getDocTypeTemplateOld(
// 	docTypes []*config.DocumentType,
// 	docType string,
// ) string {
// 	template := ""
// 	for _, t := range docTypes {
// 		if strings.ToUpper(t.Name) == docType {
// 			template = t.Template
// 			break
// 		}
// 	}
// 	return template
// }

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
