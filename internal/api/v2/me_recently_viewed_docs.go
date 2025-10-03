package api

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/hashicorp-forge/hermes/internal/server"
	pkgauth "github.com/hashicorp-forge/hermes/pkg/auth"
	"github.com/hashicorp-forge/hermes/pkg/models"
	"gorm.io/gorm"
)

type recentlyViewedDoc struct {
	ID         string `json:"id"`
	IsDraft    bool   `json:"isDraft"`
	ViewedTime int64  `json:"viewedTime"`
}

func MeRecentlyViewedDocsHandler(srv server.Server) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		errResp := func(
			httpCode int, userErrMsg, logErrMsg string, err error,
			extraArgs ...interface{}) {
			respondError(w, r, srv.Logger, httpCode, userErrMsg, logErrMsg, err,
				extraArgs...)
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
			// Find or create user.
			u := models.User{
				EmailAddress: userEmail,
			}
			if err := u.FirstOrCreate(srv.DB); err != nil {
				errResp(
					http.StatusInternalServerError,
					"Error finding recently viewed documents",
					"error finding or creating user",
					err,
				)
				return
			}

			// Get recently viewed documents for the user.
			var rvds []models.RecentlyViewedDoc
			if err := srv.DB.Where(&models.RecentlyViewedDoc{UserID: int(u.ID)}).
				Order("viewed_at desc").
				Find(&rvds).Error; err != nil {

				errResp(
					http.StatusInternalServerError,
					"Error finding recently viewed documents",
					"error finding recently viewed documents in database",
					err,
				)
				return
			}

			// Build response.
			var res []recentlyViewedDoc
			for _, d := range rvds {
				// Get document in database.
				doc := models.Document{
					Model: gorm.Model{
						ID: uint(d.DocumentID),
					},
				}
				if err := doc.Get(srv.DB); err != nil {
					// If we get an error, log it but don't return an error response
					// because this would degrade UX.
					if !errors.Is(err, gorm.ErrRecordNotFound) {
						srv.Logger.Error("error getting document in database",
							"error", err,
							"method", r.Method,
							"path", r.URL.Path,
							"document_db_id", d.DocumentID,
						)
					}
					continue
				}

				isDraft := false
				// The document is a draft if it's in WIP status and wasn't imported.
				if doc.Status == models.WIPDocumentStatus && !doc.Imported {
					isDraft = true
				}

				res = append(res, recentlyViewedDoc{
					ID:         doc.GoogleFileID,
					IsDraft:    isDraft,
					ViewedTime: d.ViewedAt.Unix(),
				})
			}

			// Write response.
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			enc := json.NewEncoder(w)
			if err := enc.Encode(res); err != nil {
				errResp(
					http.StatusInternalServerError,
					"Error finding recently viewed documents",
					"error encoding response to JSON",
					err,
				)
				return
			}

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
	})
}
