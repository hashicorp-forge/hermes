package api

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/hashicorp-forge/hermes/internal/server"
	pkgauth "github.com/hashicorp-forge/hermes/pkg/auth"
	"github.com/hashicorp-forge/hermes/pkg/document"
	"github.com/hashicorp-forge/hermes/pkg/models"
)

// MeReviewsGetResponse is the response for GET /api/v2/me/reviews
type MeReviewsGetResponse struct {
	Reviews []ReviewItemResponse `json:"reviews"`
}

// ReviewItemResponse represents a single review item
type ReviewItemResponse struct {
	DocumentID string                  `json:"documentId"`
	Document   *DocumentReviewResponse `json:"document,omitempty"`
	Status     string                  `json:"status"`
	CreatedAt  string                  `json:"createdAt"`
}

// DocumentReviewResponse represents the document in a review
type DocumentReviewResponse struct {
	ObjectID     string   `json:"objectID"`
	Title        string   `json:"title"`
	DocType      string   `json:"docType"`
	DocNumber    string   `json:"docNumber"`
	Product      string   `json:"product"`
	Status       string   `json:"status"`
	Owners       []string `json:"owners,omitempty"`
	Contributors []string `json:"contributors,omitempty"`
	ModifiedTime int64    `json:"modifiedTime"`
	Summary      string   `json:"summary,omitempty"`
}

func MeReviewsHandler(srv server.Server) http.Handler {
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
		userEmail, ok := pkgauth.GetUserEmail(r.Context())
		if !ok || userEmail == "" {
			errResp(
				http.StatusUnauthorized,
				"No authorization information for request",
				"no user email found in request context",
				nil,
			)
			return
		}

		switch r.Method {
		case "GET":
			srv.Logger.Info("fetching reviews for user",
				"email", userEmail,
				"path", r.URL.Path)

			// Get the user from database
			user := models.User{
				EmailAddress: userEmail,
			}
			if err := user.Get(srv.DB); err != nil {
				srv.Logger.Error("error getting user from database",
					"error", err,
					"email", userEmail,
				)
				// Return empty list if user not found instead of error
				w.Header().Set("Content-Type", "application/json")
				json.NewEncoder(w).Encode(MeReviewsGetResponse{
					Reviews: []ReviewItemResponse{},
				})
				return
			}

			srv.Logger.Info("found user in database",
				"email", userEmail,
				"user_id", user.ID)

			// Find all document reviews for this user
			var reviews models.DocumentReviews
			if err := reviews.Find(srv.DB, models.DocumentReview{
				User: models.User{
					EmailAddress: userEmail,
				},
			}); err != nil {
				errResp(
					http.StatusInternalServerError,
					"Error fetching reviews",
					"error finding reviews for user",
					err,
				)
				return
			}

			srv.Logger.Info("found reviews for user",
				"email", userEmail,
				"review_count", len(reviews))

			// Filter for pending reviews (UnspecifiedDocumentReviewStatus = pending)
			// and convert to response format
			var reviewItems []ReviewItemResponse
			for _, review := range reviews {
				srv.Logger.Info("processing review",
					"document_id", review.Document.GoogleFileID,
					"status", review.Status,
					"created_at", review.CreatedAt)

				// Only include pending reviews (UnspecifiedDocumentReviewStatus = 0)
				if review.Status != models.UnspecifiedDocumentReviewStatus {
					srv.Logger.Info("skipping non-pending review",
						"document_id", review.Document.GoogleFileID,
						"status", review.Status)
					continue
				}

				// Get document details
				doc := models.Document{
					GoogleFileID: review.Document.GoogleFileID,
				}
				if err := doc.Get(srv.DB); err != nil {
					srv.Logger.Warn("error getting document for review",
						"error", err,
						"document_id", review.Document.GoogleFileID,
					)
					continue
				}

				srv.Logger.Info("got document for review",
					"document_id", doc.GoogleFileID,
					"title", doc.Title,
					"doc_type", doc.DocumentType.Name)

				// Get reviews and group reviews for the document
				var docReviews models.DocumentReviews
				if err := docReviews.Find(srv.DB, models.DocumentReview{
					Document: models.Document{
						GoogleFileID: doc.GoogleFileID,
					},
				}); err != nil {
					srv.Logger.Warn("error getting reviews for document",
						"error", err,
						"document_id", doc.GoogleFileID,
					)
					continue
				}

				var groupReviews models.DocumentGroupReviews
				if err := groupReviews.Find(srv.DB, models.DocumentGroupReview{
					Document: models.Document{
						GoogleFileID: doc.GoogleFileID,
					},
				}); err != nil {
					srv.Logger.Warn("error getting group reviews for document",
						"error", err,
						"document_id", doc.GoogleFileID,
					)
					// Continue even if group reviews fail
				}

				// Convert to document type
				docObj, err := document.NewFromDatabaseModel(doc, docReviews, groupReviews)
				if err != nil {
					srv.Logger.Warn("error converting document from database model",
						"error", err,
						"document_id", doc.GoogleFileID,
					)
					continue
				}

				// Build response
				docResp := &DocumentReviewResponse{
					ObjectID:     doc.GoogleFileID,
					Title:        docObj.Title,
					DocType:      docObj.DocType,
					DocNumber:    docObj.DocNumber,
					Product:      docObj.Product,
					Status:       docObj.Status,
					ModifiedTime: docObj.ModifiedTime,
					Summary:      docObj.Summary,
				}

				// Add owners
				if len(docObj.Owners) > 0 {
					docResp.Owners = docObj.Owners
				}

				// Add contributors
				if len(docObj.Contributors) > 0 {
					docResp.Contributors = docObj.Contributors
				}

				reviewItems = append(reviewItems, ReviewItemResponse{
					DocumentID: doc.GoogleFileID,
					Document:   docResp,
					Status:     reviewStatusToString(review.Status),
					CreatedAt:  review.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
				})
			}

			srv.Logger.Info("returning review items",
				"email", userEmail,
				"pending_count", len(reviewItems))

			// Return response
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			if err := json.NewEncoder(w).Encode(MeReviewsGetResponse{
				Reviews: reviewItems,
			}); err != nil {
				srv.Logger.Error("error encoding reviews response",
					"error", err,
				)
			}

		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})
}

// reviewStatusToString converts a DocumentReviewStatus to a string
func reviewStatusToString(status models.DocumentReviewStatus) string {
	switch status {
	case models.UnspecifiedDocumentReviewStatus:
		return "pending"
	case models.ApprovedDocumentReviewStatus:
		return "approved"
	case models.ChangesRequestedDocumentReviewStatus:
		return "changes_requested"
	default:
		return fmt.Sprintf("unknown_%d", status)
	}
}
