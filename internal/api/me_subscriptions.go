package api

import (
	"encoding/json"
	"net/http"

	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/pkg/models"
	gw "github.com/hashicorp-forge/hermes/pkg/workspace/adapters/google"
	"github.com/hashicorp/go-hclog"
	"gorm.io/gorm"
)

type MeSubscriptionsPostRequest struct {
	Subscriptions []string `json:"subscriptions"`
}

func MeSubscriptionsHandler(
	cfg *config.Config,
	l hclog.Logger,
	s *gw.Service,
	db *gorm.DB,
) http.Handler {

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

			// Build response of product subscriptions.
			var products []string
			for _, p := range u.ProductSubscriptions {
				products = append(products, p.Name)
			}

			// Write response.
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			enc := json.NewEncoder(w)
			if err := enc.Encode(products); err != nil {
				errResp(
					http.StatusInternalServerError,
					"Error finding product subscriptions",
					"error encoding products to JSON",
					err,
				)
				return
			}

		case "POST":
			// Decode request.
			var req MeSubscriptionsPostRequest
			if err := decodeRequest(r, &req); err != nil {
				errResp(
					http.StatusBadRequest,
					"Bad request",
					"error decoding request",
					err,
				)
				return
			}

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

			// Build user product subscriptions.
			var subs []models.Product
			for _, p := range req.Subscriptions {
				subs = append(subs, models.Product{Name: p})
			}
			u.ProductSubscriptions = subs

			// Upsert user.
			if err := u.Upsert(db); err != nil {
				errResp(
					http.StatusInternalServerError,
					"Error updating user subscriptions",
					"error upserting user",
					err,
				)
				return
			}

			// Write response.
			w.WriteHeader(http.StatusOK)

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
	})
}
