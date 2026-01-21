// Package google provides a Google OAuth authentication adapter for Hermes.
package google

import (
	"fmt"
	"net/http"

	gw "github.com/hashicorp-forge/hermes/pkg/workspace/adapters/google"
)

const (
	// tokenHeader is the HTTP header name for the Google access token.
	tokenHeader = "Hermes-Google-Access-Token"
)

// Adapter implements the auth.Provider interface using Google OAuth.
type Adapter struct {
	service *gw.Service
}

// NewAdapter creates a new Google authentication adapter.
func NewAdapter(service *gw.Service) *Adapter {
	return &Adapter{
		service: service,
	}
}

// Authenticate validates the Google access token from the request header
// and returns the authenticated user's email address.
func (a *Adapter) Authenticate(r *http.Request) (string, error) {
	// Get user email from Google access token.
	tok := r.Header.Get(tokenHeader)
	if tok == "" {
		return "", fmt.Errorf("missing %s header", tokenHeader)
	}

	// Validate access token.
	ti, err := a.service.ValidateAccessToken(tok)
	if err != nil {
		return "", fmt.Errorf("error validating access token: %w", err)
	}

	if !ti.VerifiedEmail {
		return "", fmt.Errorf("email not verified")
	}

	if ti.Email == "" {
		return "", fmt.Errorf("no email in token")
	}

	return ti.Email, nil
}

// Name returns the provider name for logging.
func (a *Adapter) Name() string {
	return "google"
}
