package api

import (
	"encoding/json"
	"net/http"

	"github.com/hashicorp-forge/hermes/internal/server"
	pkgauth "github.com/hashicorp-forge/hermes/pkg/auth"
	"github.com/hashicorp-forge/hermes/pkg/models"
)

type recentlyViewedProject struct {
	ID         int   `json:"id"`
	ViewedTime int64 `json:"viewedTime"`
}

func MeRecentlyViewedProjectsHandler(srv server.Server) http.Handler {
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
					"Error finding recently viewed projects",
					"error finding or creating user",
					err,
				)
				return
			}

			// Get recently viewed projects for the user.
			var rvps []models.RecentlyViewedProject
			if err := srv.DB.Where(&models.RecentlyViewedProject{UserID: int(u.ID)}).
				Order("viewed_at desc").
				Find(&rvps).Error; err != nil {

				errResp(
					http.StatusInternalServerError,
					"Error finding recently viewed projects",
					"error finding recently viewed projects in database",
					err,
				)
				return
			}

			// Build response.
			var res []recentlyViewedProject
			for _, p := range rvps {
				res = append(res, recentlyViewedProject{
					ID:         p.ProjectID,
					ViewedTime: p.ViewedAt.Unix(),
				})
			}

			// Write response.
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			enc := json.NewEncoder(w)
			if err := enc.Encode(res); err != nil {
				errResp(
					http.StatusInternalServerError,
					"Error finding recently viewed projects",
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
