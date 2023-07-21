package api

import (
	"fmt"
	"net/http"

	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/pkg/algolia"
	gw "github.com/hashicorp-forge/hermes/pkg/googleworkspace"
	hcd "github.com/hashicorp-forge/hermes/pkg/hashicorpdocs"
	"github.com/hashicorp/go-hclog"
	"gorm.io/gorm"
)

func ApprovalHandler(
	cfg *config.Config,
	l hclog.Logger,
	ar *algolia.Client,
	aw *algolia.Client,
	s *gw.Service,
	db *gorm.DB) http.Handler {

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case "DELETE":
			// Validate request.
			docID, err := parseResourceIDFromURL(r.URL.Path, "approvals")
			if err != nil {
				l.Error("error parsing document ID",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
				)
				http.Error(w, "Document ID not found", http.StatusNotFound)
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

			// Get base document object from Algolia so we can determine the doc type.
			baseDocObj := &hcd.BaseDoc{}
			err = ar.Docs.GetObject(docID, &baseDocObj)
			if err != nil {
				l.Error("error requesting base document object from Algolia",
					"error", err,
					"path", r.URL.Path,
					"method", r.Method,
					"doc_id", docID,
				)
				http.Error(w, "Error requesting changes of document",
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
				http.Error(w, "Error requesting changes of document",
					http.StatusInternalServerError)
				return
			}

			// Get document object from Algolia.
			err = ar.Docs.GetObject(docID, &docObj)
			if err != nil {
				l.Error("error getting document from Algolia",
					"error", err,
					"doc_id", docID,
					"method", r.Method,
					"path", r.URL.Path,
				)
				http.Error(w, "Error accessing document",
					http.StatusInternalServerError)
				return
			}

			// Authorize request.
			userEmail := r.Context().Value("userEmail").(string)
			if docObj.GetStatus() != "In-Review" {
				http.Error(w,
					"Can only request changes of documents in the \"In-Review\" status",
					http.StatusBadRequest)
				return
			}
			if !contains(docObj.GetReviewers(), userEmail) {
				http.Error(w, "Not authorized as a document reviewer",
					http.StatusUnauthorized)
				return
			}
			if contains(docObj.GetChangesRequestedBy(), userEmail) {
				http.Error(w, "Document already has changes requested by user",
					http.StatusBadRequest)
				return
			}

			// Add email to slice of users who have requested changes of the document.
			docObj.SetChangesRequestedBy(
				append(docObj.GetChangesRequestedBy(), userEmail))

			// If user had previously reviewed, delete email from slice of users who
			// have reviewed the document.
			var newReviewedBy []string
			for _, a := range docObj.GetReviewedBy() {
				if a != userEmail {
					newReviewedBy = append(newReviewedBy, a)
				}
			}
			docObj.SetReviewedBy(newReviewedBy)

			// Get latest Google Drive file revision.
			latestRev, err := s.GetLatestRevision(docID)
			if err != nil {
				l.Error("error getting latest revision",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID)
				http.Error(w, "Error requesting changes of document",
					http.StatusInternalServerError)
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
				http.Error(w, "Error requesting changes",
					http.StatusInternalServerError)
				return
			}

			// Record file revision in the Algolia document object.
			revisionName := fmt.Sprintf("Changes requested by %s", userEmail)
			docObj.SetFileRevision(latestRev.Id, revisionName)

			// Save modified doc object in Algolia.
			res, err := aw.Docs.SaveObject(docObj)
			if err != nil {
				l.Error("error saving requested changes doc object in Algolia",
					"error", err,
					"doc_id", docID,
					"method", r.Method,
					"path", r.URL.Path,
				)
				http.Error(w, "Error requesting changes of document",
					http.StatusInternalServerError)
				return
			}
			err = res.Wait()
			if err != nil {
				l.Error("error saving requested changes doc object in Algolia",
					"error", err,
					"doc_id", docID,
					"method", r.Method,
					"path", r.URL.Path,
				)
				http.Error(w, "Error requesting changes of document",
					http.StatusInternalServerError)
				return
			}

			// Replace the doc header.
			err = docObj.ReplaceHeader(
				docID, cfg.BaseURL, true, s)
			if err != nil {
				l.Error("error replacing doc header",
					"error", err,
					"doc_id", docID,
					"method", r.Method,
					"path", r.URL.Path,
				)
				http.Error(w, "Error requesting changes of document",
					http.StatusInternalServerError)
				return
			}

			// Write response.
			w.WriteHeader(http.StatusOK)

			// Log success.
			l.Info("changes requested successfully",
				"doc_id", docID,
				"method", r.Method,
				"path", r.URL.Path,
			)

		case "POST":
			// Validate request.
			docID, err := parseResourceIDFromURL(r.URL.Path, "approvals")
			if err != nil {
				l.Error("error parsing document ID from approvals path",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
				)
				http.Error(w, "Document ID not found", http.StatusNotFound)
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

			// Get base document object from Algolia so we can determine the doc type.
			baseDocObj := &hcd.BaseDoc{}
			err = ar.Docs.GetObject(docID, &baseDocObj)
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
			err = ar.Docs.GetObject(docID, &docObj)
			if err != nil {
				l.Error("error getting document from Algolia",
					"error", err,
					"doc_id", docID,
					"method", r.Method,
					"path", r.URL.Path,
				)
				http.Error(w, "Error accessing document",
					http.StatusInternalServerError)
				return
			}

			// Authorize request.
			userEmail := r.Context().Value("userEmail").(string)
			if docObj.GetStatus() != "In-Review" && docObj.GetStatus() != "In Review" {
				http.Error(w,
					"Only documents in the \"In-Review\" status can be reviewed",
					http.StatusBadRequest)
				return
			}
			if !contains(docObj.GetReviewers(), userEmail) {
				http.Error(w,
					"Not authorized as a document reviewer",
					http.StatusUnauthorized)
				return
			}
			if contains(docObj.GetReviewedBy(), userEmail) {
				http.Error(w,
					"Document already reviewed by user",
					http.StatusBadRequest)
				return
			}

			// Add email to slice of users who have reviewed the document.
			docObj.SetReviewedBy(append(docObj.GetReviewedBy(), userEmail))

			// If the user had previously requested changes, delete email from slice
			// of users who have requested changes of the document.
			var newChangesRequestedBy []string
			for _, a := range docObj.GetChangesRequestedBy() {
				if a != userEmail {
					newChangesRequestedBy = append(newChangesRequestedBy, a)
				}
			}
			docObj.SetChangesRequestedBy(newChangesRequestedBy)

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
				return
			}

			// Record file revision in the Algolia document object.
			revisionName := fmt.Sprintf("Reviewed by %s", userEmail)
			docObj.SetFileRevision(latestRev.Id, revisionName)

			// Save modified doc object in Algolia.
			res, err := aw.Docs.SaveObject(docObj)
			if err != nil {
				l.Error("error saving reviewed doc object in Algolia",
					"error", err,
					"doc_id", docID,
					"method", r.Method,
					"path", r.URL.Path,
				)
				http.Error(w, "Error reviewing document",
					http.StatusInternalServerError)
				return
			}
			err = res.Wait()
			if err != nil {
				l.Error("error saving reviewed doc object in Algolia",
					"error", err,
					"doc_id", docID,
					"method", r.Method,
					"path", r.URL.Path,
				)
				http.Error(w, "Error reviewing document",
					http.StatusInternalServerError)
				return
			}

			// Replace the doc header.
			err = docObj.ReplaceHeader(
				docID, cfg.BaseURL, true, s)
			if err != nil {
				l.Error("error replacing doc header",
					"error", err,
					"doc_id", docID,
					"method", r.Method,
					"path", r.URL.Path,
				)
				http.Error(w, "Error reviewing document",
					http.StatusInternalServerError)
				return
			}

			// Write response.
			w.WriteHeader(http.StatusOK)

			// Log success.
			l.Info("approval created",
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
