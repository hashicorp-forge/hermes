package api

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"net/http"
	"time"

	"github.com/algolia/algoliasearch-client-go/v3/algolia/errs"
	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/pkg/algolia"
	gw "github.com/hashicorp-forge/hermes/pkg/googleworkspace"
	hcd "github.com/hashicorp-forge/hermes/pkg/hashicorpdocs"
	"github.com/hashicorp-forge/hermes/pkg/models"
	"github.com/hashicorp/go-hclog"
	"gorm.io/gorm"
)

// DocumentPatchRequest contains a subset of documents fields that are allowed
// to be updated with a PATCH request.
type DocumentPatchRequest struct {
	Reviewers    []string `json:"reviewers,omitempty"`
	Contributors []string `json:"contributors,omitempty"`
	Status       string   `json:"status,omitempty"`
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

func DocumentHandler(
	cfg *config.Config,
	l hclog.Logger,
	ar *algolia.Client,
	aw *algolia.Client,
	s *gw.Service,
	db *gorm.DB) http.Handler {

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Parse document ID from the URL path.
		docID, err := parseURLPath(r.URL.Path, "/api/v1/documents")
		if err != nil {
			l.Error("error parsing document ID from the URL path",
				"error", err,
				"path", r.URL.Path,
				"method", r.Method,
			)
			http.Error(w, "Error accessing document", http.StatusInternalServerError)
			return
		}

		// Get base document object from Algolia so we can determine the doc type.
		baseDocObj := &hcd.BaseDoc{}
		err = ar.Docs.GetObject(docID, &baseDocObj)
		if err != nil {
			// Handle 404 from Algolia and only log a warning.
			if _, is404 := errs.IsAlgoliaErrWithCode(err, 404); is404 {
				l.Warn("base document object not found",
					"error", err,
					"path", r.URL.Path,
					"method", r.Method,
					"doc_id", docID,
				)
				http.Error(w, "Document not found", http.StatusNotFound)
				return
			} else {
				l.Error("error requesting base document object from Algolia",
					"error", err,
					"path", r.URL.Path,
					"method", r.Method,
					"doc_id", docID,
				)
				http.Error(w, "Error accessing document",
					http.StatusInternalServerError)
				return
			}
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
			http.Error(w, "Error accessing document",
				http.StatusInternalServerError)
			return
		}

		// Get document object from Algolia.
		err = ar.Docs.GetObject(docID, &docObj)
		if err != nil {
			l.Error("error retrieving document object from Algolia",
				"error", err,
				"path", r.URL.Path,
				"method", r.Method,
				"doc_id", docID,
			)
			http.Error(w, "Error accessing document", http.StatusInternalServerError)
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
			docObj.SetModifiedTime(modifiedTime.Unix())

			// Set custom editable fields.
			docObj.SetCustomEditableFields()

			// Get document from database.
			doc := models.Document{
				GoogleFileID: docID,
			}
			if err := doc.Get(db); err != nil {
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
			docObj.SetLocked(doc.Locked)

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
				email := r.Context().Value("userEmail").(string)

				if err := updateRecentlyViewedDocs(email, docID, db, now); err != nil {
					// If we get an error, log it but don't return an error response
					// because this would degrade UX.
					// TODO: change this log back to an error when this handles incomplete
					// data in the database.
					l.Warn("error updating recently viewed docs",
						"error", err,
						"doc_id", docID,
						"method", r.Method,
						"path", r.URL.Path,
					)
					return
				}
			}

			l.Info("retrieved document",
				"doc_id", docID,
			)

		case "PATCH":
			canPatchDocument:=true
			// Authorize request (only the owner can PATCH the doc).
			userEmail := r.Context().Value("userEmail").(string)
			for _, reviewer := range docObj.GetReviewers() {
				if reviewer==userEmail {
					canPatchDocument=false
					break
				}
			}
			if userEmail==docObj.GetOwners()[0] {
				canPatchDocument=false
			}

			if canPatchDocument {
				http.Error(w, "Not a document owner", http.StatusUnauthorized)
				return
			}

			// Copy request body so we can use both for validation using the request
			// struct, and then afterwards for patching the document JSON.
			buf, err := ioutil.ReadAll(r.Body)
			if err != nil {
				l.Error("error reading request body",
					"error", err,
					"path", r.URL.Path,
					"method", r.Method,
					"doc_id", docID)
				http.Error(w, "Error patching document",
					http.StatusInternalServerError)
				return
			}
			body := ioutil.NopCloser(bytes.NewBuffer(buf))
			newBody := ioutil.NopCloser(bytes.NewBuffer(buf))
			r.Body = newBody

			// Decode request. The request struct validates that the request only
			// contains fields that are allowed to be patched.
			var req DocumentPatchRequest
			if err := decodeRequest(r, &req); err != nil {
				l.Error("error decoding document patch request", "error", err)
				http.Error(w, fmt.Sprintf("Bad request: %q", err),
					http.StatusBadRequest)
				return
			}

			// Check if document is locked.
			locked, err := hcd.IsLocked(docID, db, s, l)
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

			// Compare reviewers in req and stored object in Algolia
			// before we save the patched objected
			var reviewersToEmail []string
			if len(docObj.GetReviewers()) == 0 && len(req.Reviewers) != 0 {
				// If there are no reviewers of the document
				// email the reviewers in the request
				reviewersToEmail = req.Reviewers
			} else if len(req.Reviewers) != 0 {
				// Only compare when there are stored reviewers
				// and reviewers in the request
				reviewersToEmail = compareSlices(docObj.GetReviewers(), req.Reviewers)
			}

			// Patch document by decoding the (now validated) request body JSON to the
			// document object.
			err = json.NewDecoder(body).Decode(docObj)
			if err != nil {
				l.Error("error decoding request body to document object",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID)
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

			// load template
			// Load the email template
			//var body bytes.Buffer
			templateBytes, err := ioutil.ReadFile("templates/review_email_template.html")
			if err != nil {
				l.Error("error parsing template: ", "err", err)
				return
			}

			// Send emails to new reviewers.
			if cfg.Email != nil && cfg.Email.Enabled {
				if len(reviewersToEmail) > 0 {
					// TODO: use a template for email content.
					rawBody := string(templateBytes)
					// returns the "baseurl/documents/{docid}"
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
					//body := fmt.Sprintf(rawBody, docURL, docObj.GetDocNumber(), docObj.GetTitle())
					body := fmt.Sprintf(rawBody, docURL, docObj.GetProduct(), docObj.GetTitle())

					// TODO: use an asynchronous method for sending emails because we
					// can't currently recover gracefully on a failure here.
					for _, reviewerEmail := range reviewersToEmail {
						_, err = s.SendEmail(
							[]string{reviewerEmail},
							cfg.Email.FromAddress,
							fmt.Sprintf("[%s]%s | Doc Review Request from %s", docObj.GetDocType(), docObj.GetTitle(), docObj.GetOwners()[0]),
							//fmt.Sprintf("Document review requested for %s", docObj.GetDocNumber()),
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
					l.Info("Reviewers emails sent")
				}
			}

			// Replace the doc header.
			err = docObj.ReplaceHeader(docID, cfg.BaseURL, true, s)
			if err != nil {
				l.Error("error replacing document header",
					"error", err, "doc_id", docID)
				http.Error(w, "Error patching document",
					http.StatusInternalServerError)
				return
			}

			// Rename file with new title.
			s.RenameFile(docID,
				fmt.Sprintf("[%s] %s", docObj.GetProduct(), req.Title))

			w.WriteHeader(http.StatusOK)
			l.Info("patched document", "doc_id", docID)
			return

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
			return fmt.Errorf("error getting document: %w", err)
		}
		docs = append(docs, dd)
	}

	// Trim recently viewed documents to a length of 5.
	if len(docs) > 5 {
		docs = docs[:5]
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
