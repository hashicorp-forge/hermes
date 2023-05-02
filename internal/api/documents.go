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
	Approvers    []string `json:"approvers,omitempty"`
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
			// Authorize request (only the owner can PATCH the doc).
			userEmail := r.Context().Value("userEmail").(string)
			if docObj.GetOwners()[0] != userEmail {
				http.Error(w,
					`{"error": "Not a document owner"}`,
					http.StatusUnauthorized)
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

			// Compare approvers in req and stored object in Algolia
			// before we save the patched objected
			var approversToEmail []string
			if len(docObj.GetApprovers()) == 0 && len(req.Approvers) != 0 {
				// If there are no approvers of the document
				// email the approvers in the request
				approversToEmail = req.Approvers
			} else if len(req.Approvers) != 0 {
				// Only compare when there are stored approvers
				// and approvers in the request
				approversToEmail = compareSlices(docObj.GetApprovers(), req.Approvers)
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
					body := fmt.Sprintf(rawBody, docURL, docObj.GetDocNumber(), docObj.GetTitle())

					// TODO: use an asynchronous method for sending emails because we
					// can't currently recover gracefully on a failure here.
					for _, approverEmail := range approversToEmail {
						_, err = s.SendEmail(
							[]string{approverEmail},
							cfg.Email.FromAddress,
							fmt.Sprintf("Document review requested for %s", docObj.GetDocNumber()),
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
				fmt.Sprintf("[%s] %s", docObj.GetDocNumber(), docObj.GetTitle()))

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

	// Prepend document to recently viewed documents.
	rvd := append(
		[]models.Document{{GoogleFileID: docID}},
		u.RecentlyViewedDocs...)

	// Trim recently viewed documents to a length of 5.
	if len(rvd) > 5 {
		rvd = rvd[:5]
	}

	// Update user.
	u.RecentlyViewedDocs = rvd
	if err := u.Upsert(db); err != nil {
		return fmt.Errorf("error upserting user: %w", err)
	}

	// Get document in database to get the ID.
	doc := models.Document{
		GoogleFileID: docID,
	}
	if err := doc.Get(db); err != nil {
		return fmt.Errorf("error getting document: %w", err)
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
