package api

import (
	"errors"
	"fmt"
	"net/http"

	pkgauth "github.com/hashicorp-forge/hermes/pkg/auth"

	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/internal/helpers"
	"github.com/hashicorp-forge/hermes/pkg/document"
	hcd "github.com/hashicorp-forge/hermes/pkg/hashicorpdocs"
	"github.com/hashicorp-forge/hermes/pkg/models"
	"github.com/hashicorp-forge/hermes/pkg/search"
	"github.com/hashicorp-forge/hermes/pkg/workspace"
	"github.com/hashicorp/go-hclog"
	"gorm.io/gorm"
)

func ApprovalHandler(
	cfg *config.Config,
	l hclog.Logger,
	searchProvider search.Provider,
	workspaceProvider workspace.Provider,
	db *gorm.DB) http.Handler {

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
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
			locked, err := hcd.IsLocked(docID, db, workspaceProvider, l)
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

			// Get document object from search index.
			searchDoc, err := searchProvider.DocumentIndex().GetObject(ctx, docID)
			if err != nil {
				// Handle 404 from search index and only log a warning.
				if errors.Is(err, search.ErrNotFound) {
					l.Warn("document object not found in search index",
						"error", err,
						"path", r.URL.Path,
						"method", r.Method,
						"doc_id", docID,
					)
					http.Error(w, "Document not found", http.StatusNotFound)
					return
				} else {
					l.Error("error requesting document from search index",
						"error", err,
						"doc_id", docID,
					)
					http.Error(w, "Error accessing document",
						http.StatusInternalServerError)
					return
				}
			}

			// Convert search document to Algolia-compatible map.
			algoObj, err := searchDocumentToMap(searchDoc)
			if err != nil {
				l.Error("error converting search document",
					"error", err,
					"doc_id", docID,
				)
				http.Error(w, "Error accessing document",
					http.StatusInternalServerError)
				return
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

			// Authorize request.
			userEmail := pkgauth.MustGetUserEmail(r.Context())
			if doc.Status != "In-Review" {
				http.Error(w,
					"Can only request changes of documents in the \"In-Review\" status",
					http.StatusBadRequest)
				return
			}
			if !contains(doc.Approvers, userEmail) {
				http.Error(w, "Not authorized as a document approver",
					http.StatusUnauthorized)
				return
			}
			if contains(doc.ChangesRequestedBy, userEmail) {
				http.Error(w, "Document already has changes requested by user",
					http.StatusBadRequest)
				return
			}

			// Add email to slice of users who have requested changes of the document.
			doc.ChangesRequestedBy = append(doc.ChangesRequestedBy, userEmail)

			// If user had previously approved, delete email from slice of users who
			// have approved the document.
			var newApprovedBy []string
			for _, a := range doc.ApprovedBy {
				if a != userEmail {
					newApprovedBy = append(newApprovedBy, a)
				}
			}
			doc.ApprovedBy = newApprovedBy

			// Get latest Google Drive file revision.
			latestRev, err := workspaceProvider.GetLatestRevision(docID)
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
			_, err = workspaceProvider.KeepRevisionForever(docID, latestRev.Id)
			if err != nil {
				l.Error("error marking revision to keep forever",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID,
					"rev_id", latestRev.Id)
				http.Error(w, "Error updating document status",
					http.StatusInternalServerError)
				return
			}

			// Record file revision in the Algolia document object.
			revisionName := fmt.Sprintf("Changes requested by %s", userEmail)
			doc.SetFileRevision(latestRev.Id, revisionName)

			// Convert document to Algolia object.
			docObj, err := doc.ToAlgoliaObject(true)
			if err != nil {
				l.Error("error converting document to Algolia object",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID,
				)
				http.Error(w, "Error updating document status",
					http.StatusInternalServerError)
				return
			}

			// Convert to search document and save in search index.
			searchDocUpdate, err := mapToSearchDocument(docObj)
			if err != nil {
				l.Error("error converting to search document",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID)
				http.Error(w, "Error updating document status",
					http.StatusInternalServerError)
				return
			}

			err = searchProvider.DocumentIndex().Index(ctx, searchDocUpdate)
			if err != nil {
				l.Error("error saving approved document in search index",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID)
				http.Error(w, "Error updating document status",
					http.StatusInternalServerError)
				return
			}

			// Replace the doc header.
			if err := doc.ReplaceHeader(cfg.BaseURL, false, workspaceProvider); err != nil {
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

			// Update document reviews in the database.
			if err := updateDocumentReviewsInDatabase(*doc, db); err != nil {
				l.Error("error updating document reviews in the database",
					"error", err,
					"doc_id", docID,
					"method", r.Method,
					"path", r.URL.Path,
				)
				// Don't return an HTTP error because the database isn't the source of
				// truth yet.
			}

			// Write response.
			w.WriteHeader(http.StatusOK)

			// Log success.
			l.Info("changes requested successfully",
				"doc_id", docID,
				"method", r.Method,
				"path", r.URL.Path,
			)

			// Compare search index and database documents to find data inconsistencies.
			// Get document object from search index.
			searchDocComp, err := searchProvider.DocumentIndex().GetObject(ctx, docID)
			if err != nil {
				l.Error("error getting search document for data comparison",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID,
				)
				return
			}
			// Convert to map for comparison function
			algoDoc, err := searchDocumentToMap(searchDocComp)
			if err != nil {
				l.Error("error converting search document for comparison",
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
			locked, err := hcd.IsLocked(docID, db, workspaceProvider, l)
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

			// Get document object from search index.
			searchDoc, err := searchProvider.DocumentIndex().GetObject(ctx, docID)
			if err != nil {
				// Handle 404 from search index and only log a warning.
				if errors.Is(err, search.ErrNotFound) {
					l.Warn("document object not found in search index",
						"error", err,
						"path", r.URL.Path,
						"method", r.Method,
						"doc_id", docID,
					)
					http.Error(w, "Document not found", http.StatusNotFound)
					return
				} else {
					l.Error("error requesting document from search index",
						"error", err,
						"doc_id", docID,
					)
					http.Error(w, "Error accessing document",
						http.StatusInternalServerError)
					return
				}
			}

			// Convert search document to Algolia-compatible map.
			algoObj, err := searchDocumentToMap(searchDoc)
			if err != nil {
				l.Error("error converting search document",
					"error", err,
					"doc_id", docID,
				)
				http.Error(w, "Error accessing document",
					http.StatusInternalServerError)
				return
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

			// Authorize request.
			userEmail := pkgauth.MustGetUserEmail(r.Context())
			if doc.Status != "In-Review" && doc.Status != "Approved" {
				http.Error(w,
					`Document status must be "In-Review" or "Approved" to approve`,
					http.StatusBadRequest)
				return
			}
			if !contains(doc.Approvers, userEmail) {
				http.Error(w,
					"Not authorized as a document approver",
					http.StatusUnauthorized)
				return
			}
			if contains(doc.ApprovedBy, userEmail) {
				http.Error(w,
					"Document already approved by user",
					http.StatusBadRequest)
				return
			}

			// Add email to slice of users who have approved the document.
			doc.ApprovedBy = append(doc.ApprovedBy, userEmail)

			// If the user had previously requested changes, delete email from slice
			// of users who have requested changes of the document.
			var newChangesRequestedBy []string
			for _, a := range doc.ChangesRequestedBy {
				if a != userEmail {
					newChangesRequestedBy = append(newChangesRequestedBy, a)
				}
			}
			doc.ChangesRequestedBy = newChangesRequestedBy

			// Get latest Google Drive file revision.
			latestRev, err := workspaceProvider.GetLatestRevision(docID)
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
			_, err = workspaceProvider.KeepRevisionForever(docID, latestRev.Id)
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
			revisionName := fmt.Sprintf("Approved by %s", userEmail)
			doc.SetFileRevision(latestRev.Id, revisionName)

			// Convert document to Algolia object.
			docObj, err := doc.ToAlgoliaObject(true)
			if err != nil {
				l.Error("error converting document to Algolia object",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID,
				)
				http.Error(w, "Error updating document status",
					http.StatusInternalServerError)
				return
			}

			// Convert to search document and save in search index.
			searchDocUpdate, err := mapToSearchDocument(docObj)
			if err != nil {
				l.Error("error converting to search document",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID)
				http.Error(w, "Error updating document status",
					http.StatusInternalServerError)
				return
			}

			err = searchProvider.DocumentIndex().Index(ctx, searchDocUpdate)
			if err != nil {
				l.Error("error saving approved document in search index",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID)
				http.Error(w, "Error updating document status",
					http.StatusInternalServerError)
				return
			}

			// Replace the doc header.
			err = doc.ReplaceHeader(cfg.BaseURL, false, workspaceProvider)
			if err != nil {
				l.Error("error replacing doc header",
					"error", err,
					"doc_id", docID,
					"method", r.Method,
					"path", r.URL.Path,
				)
				http.Error(w, "Error approving document",
					http.StatusInternalServerError)
				return
			}

			// Update document reviews in the database.
			if err := updateDocumentReviewsInDatabase(*doc, db); err != nil {
				l.Error("error updating document reviews in the database",
					"error", err,
					"doc_id", docID,
					"method", r.Method,
					"path", r.URL.Path,
				)
				// Don't return an HTTP error because the database isn't the source of
				// truth yet.
			}

			// Write response.
			w.WriteHeader(http.StatusOK)

			// Log success.
			l.Info("approval created",
				"doc_id", docID,
				"method", r.Method,
				"path", r.URL.Path,
			)

			// Compare search index and database documents to find data inconsistencies.
			// Get document object from search index.
			searchDocComp2, err := searchProvider.DocumentIndex().GetObject(ctx, docID)
			if err != nil {
				l.Error("error getting search document for data comparison",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID,
				)
				return
			}
			// Convert to map for comparison function
			algoDoc, err := searchDocumentToMap(searchDocComp2)
			if err != nil {
				l.Error("error converting search document for comparison",
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

// updateDocumentReviewsInDatabase takes a document and updates the associated
// document reviews in the database.
func updateDocumentReviewsInDatabase(doc document.Document, db *gorm.DB) error {
	var docReviews []models.DocumentReview
	for _, a := range doc.Approvers {
		u := models.User{
			EmailAddress: a,
		}
		if helpers.StringSliceContains(doc.ApprovedBy, a) {
			docReviews = append(docReviews, models.DocumentReview{
				Document: models.Document{
					GoogleFileID: doc.ObjectID,
				},
				User:   u,
				Status: models.ApprovedDocumentReviewStatus,
			})
		} else if helpers.StringSliceContains(doc.ChangesRequestedBy, a) {
			docReviews = append(docReviews, models.DocumentReview{
				Document: models.Document{
					GoogleFileID: doc.ObjectID,
				},
				User:   u,
				Status: models.ChangesRequestedDocumentReviewStatus,
			})
		}
	}

	// Upsert document reviews in database.
	for _, dr := range docReviews {
		if err := dr.Update(db); err != nil {
			return fmt.Errorf("error upserting document review: %w", err)
		}
	}

	return nil
}
