package google

import (
	"context"
	"net/http"

	gw "github.com/hashicorp-forge/hermes/pkg/storage/adapters/google"
	"github.com/hashicorp/go-hclog"
)

const (
	tokenHeader = "Hermes-Google-Access-Token"
)

// AuthenticateRequest is middleware that authenticates an HTTP request using
// Google.
func AuthenticateRequest(
	s *gw.Service, log hclog.Logger, next http.Handler,
) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Get user email from Google access token.
		tok := r.Header.Get(tokenHeader)

		// Validate access token.
		ti, err := s.ValidateAccessToken(tok)
		if err != nil || !ti.VerifiedEmail {
			log.Error("error validating Google access token",
				"error", err,
				"method", r.Method,
				"path", r.URL.Path,
			)
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		if ti.Email == "" {
			log.Error("no user email found in Google access token",
				"method", r.Method,
				"path", r.URL.Path,
			)
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Set userEmail in request context.
		ctx := context.WithValue(r.Context(), "userEmail", ti.Email)
		r = r.WithContext(ctx)

		next.ServeHTTP(w, r)
	})
}
