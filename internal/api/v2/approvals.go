package api

import (
	"fmt"
	"net/http"

	"github.com/hashicorp-forge/hermes/internal/helpers"
	"github.com/hashicorp-forge/hermes/internal/server"
	"github.com/hashicorp-forge/hermes/pkg/document"
	hcd "github.com/hashicorp-forge/hermes/pkg/hashicorpdocs"
	"github.com/hashicorp-forge/hermes/pkg/models"
	"gorm.io/gorm"
)

func ApprovalsHandler(srv server.Server) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case "DELETE":
			// Validate request.
			docID, err := parseResourceIDFromURL(r.URL.Path, "approvals")
			if err != nil {
				srv.Logger.Error("error parsing document ID",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
				)
				http.Error(w, "Document ID not found", http.StatusNotFound)
				return
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

			// Get document from database.
			model := models.Document{
				GoogleFileID: docID,
			}
			if err := model.Get(srv.DB); err != nil {
				srv.Logger.Error("error getting document from database",
					"error", err,
					"path", r.URL.Path,
					"method", r.Method,
					"doc_id", docID,
				)
				http.Error(w, "Error accessing document",
					http.StatusInternalServerError)
				return
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
				return
			}

			// Convert database model to a document.
			doc, err := document.NewFromDatabaseModel(
				model, reviews)
			if err != nil {
				srv.Logger.Error("error converting database model to document type",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID,
				)
				http.Error(w, "Error accessing document",
					http.StatusInternalServerError)
				return
			}

			// Authorize request.
			userEmail := r.Context().Value("userEmail").(string)
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
			latestRev, err := srv.GWService.GetLatestRevision(docID)
			if err != nil {
				srv.Logger.Error("error getting latest revision",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID)
				http.Error(w, "Error requesting changes of document",
					http.StatusInternalServerError)
				return
			}

			// Mark latest revision to be kept forever.
			_, err = srv.GWService.KeepRevisionForever(docID, latestRev.Id)
			if err != nil {
				srv.Logger.Error("error marking revision to keep forever",
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

			// Create file revision in the database.
			fr := models.DocumentFileRevision{
				Document: models.Document{
					GoogleFileID: docID,
				},
				GoogleDriveFileRevisionID: latestRev.Id,
				Name:                      revisionName,
			}
			if err := fr.Create(srv.DB); err != nil {
				srv.Logger.Error("error creating document file revision",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID,
					"rev_id", latestRev.Id)
				http.Error(w, "Error updating document status",
					http.StatusInternalServerError)
				return
			}

			// Update document reviews in the database.
			if err := updateDocumentReviewsInDatabase(*doc, srv.DB); err != nil {
				srv.Logger.Error("error updating document reviews in the database",
					"error", err,
					"doc_id", docID,
					"method", r.Method,
					"path", r.URL.Path,
				)
				http.Error(w, "Error updating document status",
					http.StatusInternalServerError)
				return
			}

			// Replace the doc header.
			if err := doc.ReplaceHeader(
				srv.Config.BaseURL, false, srv.GWService,
			); err != nil {
				srv.Logger.Error("error replacing doc header",
					"error", err,
					"doc_id", docID,
					"method", r.Method,
					"path", r.URL.Path,
				)
				http.Error(w, "Error updating document status",
					http.StatusInternalServerError)
				return
			}

			// Write response.
			w.WriteHeader(http.StatusOK)

			// Log success.
			srv.Logger.Info("changes requested successfully",
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
					http.Error(w, "Error updating document status",
						http.StatusInternalServerError)
					return
				}

				// Save new modified doc object in Algolia.
				res, err := srv.AlgoWrite.Docs.SaveObject(docObj)
				if err != nil {
					srv.Logger.Error("error saving approved document in Algolia",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"doc_id", docID)
					http.Error(w, "Error updating document status",
						http.StatusInternalServerError)
					return
				}
				err = res.Wait()
				if err != nil {
					srv.Logger.Error("error saving patched document in Algolia",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"doc_id", docID)
					http.Error(w, "Error updating document status",
						http.StatusInternalServerError)
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

		case "POST":
			// Validate request.
			docID, err := parseResourceIDFromURL(r.URL.Path, "approvals")
			if err != nil {
				srv.Logger.Error("error parsing document ID from approvals path",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
				)
				http.Error(w, "Document ID not found", http.StatusNotFound)
				return
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

			// Get document from database.
			model := models.Document{
				GoogleFileID: docID,
			}
			if err := model.Get(srv.DB); err != nil {
				srv.Logger.Error("error getting document from database",
					"error", err,
					"path", r.URL.Path,
					"method", r.Method,
					"doc_id", docID,
				)
				http.Error(w, "Error accessing document",
					http.StatusInternalServerError)
				return
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
				return
			}

			// Convert database model to a document.
			doc, err := document.NewFromDatabaseModel(
				model, reviews)
			if err != nil {
				srv.Logger.Error("error converting database model to document type",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID,
				)
				http.Error(w, "Error accessing document",
					http.StatusInternalServerError)
				return
			}

			// Authorize request.
			userEmail := r.Context().Value("userEmail").(string)
			if doc.Status != "In-Review" && doc.Status != "In Review" {
				http.Error(w,
					"Only documents in the \"In-Review\" status can be approved",
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
			latestRev, err := srv.GWService.GetLatestRevision(docID)
			if err != nil {
				srv.Logger.Error("error getting latest revision",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID)
				http.Error(w, "Error creating review",
					http.StatusInternalServerError)
				return
			}

			// Mark latest revision to be kept forever.
			_, err = srv.GWService.KeepRevisionForever(docID, latestRev.Id)
			if err != nil {
				srv.Logger.Error("error marking revision to keep forever",
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

			// Create file revision in the database.
			fr := models.DocumentFileRevision{
				Document: models.Document{
					GoogleFileID: docID,
				},
				GoogleDriveFileRevisionID: latestRev.Id,
				Name:                      revisionName,
			}
			if err := fr.Create(srv.DB); err != nil {
				srv.Logger.Error("error creating document file revision",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
					"doc_id", docID,
					"rev_id", latestRev.Id)
				http.Error(w, "Error updating document status",
					http.StatusInternalServerError)
				return
			}

			// Update document reviews in the database.
			if err := updateDocumentReviewsInDatabase(*doc, srv.DB); err != nil {
				srv.Logger.Error("error updating document reviews in the database",
					"error", err,
					"doc_id", docID,
					"method", r.Method,
					"path", r.URL.Path,
				)
				http.Error(w, "Error approving document",
					http.StatusInternalServerError)
				return
			}

			// Replace the doc header.
			err = doc.ReplaceHeader(srv.Config.BaseURL, false, srv.GWService)
			if err != nil {
				srv.Logger.Error("error replacing doc header",
					"error", err,
					"doc_id", docID,
					"method", r.Method,
					"path", r.URL.Path,
				)
				http.Error(w, "Error approving document",
					http.StatusInternalServerError)
				return
			}

			// Write response.
			w.WriteHeader(http.StatusOK)

			// Log success.
			srv.Logger.Info("approval created",
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
					http.Error(w, "Error updating document status",
						http.StatusInternalServerError)
					return
				}

				// Save new modified doc object in Algolia.
				res, err := srv.AlgoWrite.Docs.SaveObject(docObj)
				if err != nil {
					srv.Logger.Error("error saving approved document in Algolia",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"doc_id", docID)
					http.Error(w, "Error updating document status",
						http.StatusInternalServerError)
					return
				}
				err = res.Wait()
				if err != nil {
					srv.Logger.Error("error saving approved document in Algolia",
						"error", err,
						"method", r.Method,
						"path", r.URL.Path,
						"doc_id", docID)
					http.Error(w, "Error updating document status",
						http.StatusInternalServerError)
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
