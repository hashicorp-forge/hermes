package api

import (
	"encoding/json"
	pkgauth "github.com/hashicorp-forge/hermes/pkg/auth"
	"errors"
	"net/http"

	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/pkg/models"
	"github.com/hashicorp/go-hclog"
	"gorm.io/gorm"
)

type recentlyViewedDoc struct {
	ID      string `json:"id"`
	IsDraft bool   `json:"isDraft"`
}

func MeRecentlyViewedDocsHandler(
	cfg *config.Config,
	l hclog.Logger,
	db *gorm.DB,
) http.Handler {

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		errResp := func(
			httpCode int, userErrMsg, logErrMsg string, err error,
			extraArgs ...interface{}) {
			respondError(w, r, l, httpCode, userErrMsg, logErrMsg, err, extraArgs...)
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
		case "GET":
			// Find or create user.
			u := models.User{
				EmailAddress: userEmail,
			}
			if err := u.FirstOrCreate(db); err != nil {
				errResp(
					http.StatusInternalServerError,
					"Error authorizing the request",
					"error finding or creating user",
					err,
				)
				return
			}

			// Get recently viewed documents for the user.
			var rvds []models.RecentlyViewedDoc
			if err := db.Where(&models.RecentlyViewedDoc{UserID: int(u.ID)}).
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
				if err := doc.Get(db); err != nil {
					// If we get an error, log it but don't return an error response
					// because this would degrade UX.
					if !errors.Is(err, gorm.ErrRecordNotFound) {
						l.Error("error getting document in database",
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
					ID:      doc.GoogleFileID,
					IsDraft: isDraft,
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
