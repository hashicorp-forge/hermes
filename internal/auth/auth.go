package auth

import (
	"net/http"

	"github.com/hashicorp-forge/hermes/internal/auth/google"
	"github.com/hashicorp-forge/hermes/internal/auth/oktaalb"
	"github.com/hashicorp-forge/hermes/internal/config"
	gw "github.com/hashicorp-forge/hermes/pkg/storage/adapters/google"
	"github.com/hashicorp/go-hclog"
)

// AuthenticateRequest is middleware that authenticates an HTTP request.
func AuthenticateRequest(
	cfg config.Config, gwSvc *gw.Service, log hclog.Logger, next http.Handler,
) http.Handler {
	// If Okta isn't disabled, authenticate using Okta.
	if cfg.Okta != nil && !cfg.Okta.Disabled {
		// Create Okta authorizer.
		oa, err := oktaalb.New(*cfg.Okta, log)
		if err != nil {
			log.Error("error creating Okta authenticator")
			return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				http.Error(w, "Internal server error", http.StatusInternalServerError)
				return
			})
		}

		// Return handler wrapped with Okta auth.
		return oa.EnforceOktaAuth(
			http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				validateUserEmail(w, r, log)
				next.ServeHTTP(w, r)
			}))
	}

	// Authenticate using Google.
	return google.AuthenticateRequest(gwSvc, log,
		// Return handler wrapped with Google auth.
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			validateUserEmail(w, r, log)
			next.ServeHTTP(w, r)
		}))
}

// validateUserEmail validates that userEmail was set in the request's context.
// It responds with an internal server error if not found because this should
// be set by all authentication methods. userEmail is used for authorization in
// API endpoint implmentations.
func validateUserEmail(
	w http.ResponseWriter, r *http.Request, log hclog.Logger,
) {
	if r.Context().Value("userEmail") == nil {
		log.Error("userEmail is not set in the request context",
			"method", r.Method,
			"path", r.URL.Path)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
}
