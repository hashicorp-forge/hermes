package api

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"net/http"
	"net/url"
	"time"

	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/pkg/auth/adapters/dex"
	"github.com/hashicorp/go-hclog"
)

const (
	// Session cookie name for storing user email
	sessionCookieName = "hermes_session"
	// State cookie name for CSRF protection
	stateCookieName = "hermes_oauth_state"
	// Cookie max age (7 days)
	cookieMaxAge = 7 * 24 * time.Hour
)

// LoginHandler redirects the user to the Dex OIDC authorization endpoint.
// It generates a random state parameter for CSRF protection and stores it in a cookie.
func LoginHandler(cfg config.Config, log hclog.Logger) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Only support Dex authentication
		if cfg.Dex == nil || cfg.Dex.Disabled {
			http.Error(w, "Dex authentication not configured", http.StatusInternalServerError)
			return
		}

		// Create Dex adapter
		adapter, err := dex.NewAdapter(*cfg.Dex, log)
		if err != nil {
			log.Error("failed to create Dex adapter", "error", err)
			http.Error(w, "Authentication configuration error", http.StatusInternalServerError)
			return
		}

		// Generate random state for CSRF protection
		state, err := generateRandomState()
		if err != nil {
			log.Error("failed to generate state", "error", err)
			http.Error(w, "Failed to generate state", http.StatusInternalServerError)
			return
		}

		// Store state in cookie
		http.SetCookie(w, &http.Cookie{
			Name:     stateCookieName,
			Value:    state,
			Path:     "/",
			MaxAge:   int(5 * time.Minute / time.Second), // State expires in 5 minutes
			HttpOnly: true,
			Secure:   r.TLS != nil,
			SameSite: http.SameSiteLaxMode,
		})

		// Redirect to Dex authorization URL
		authURL := adapter.GetAuthCodeURL(state)
		log.Debug("redirecting to Dex authorization URL", "url", authURL)
		http.Redirect(w, r, authURL, http.StatusFound)
	})
}

// CallbackHandler handles the OAuth2 callback from Dex.
// It exchanges the authorization code for an ID token, validates it,
// and establishes a session for the authenticated user.
func CallbackHandler(cfg config.Config, log hclog.Logger) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Only support Dex authentication
		if cfg.Dex == nil || cfg.Dex.Disabled {
			http.Error(w, "Dex authentication not configured", http.StatusInternalServerError)
			return
		}

		// Create Dex adapter
		adapter, err := dex.NewAdapter(*cfg.Dex, log)
		if err != nil {
			log.Error("failed to create Dex adapter", "error", err)
			http.Error(w, "Authentication configuration error", http.StatusInternalServerError)
			return
		}

		// Get state from cookie
		stateCookie, err := r.Cookie(stateCookieName)
		if err != nil {
			log.Error("state cookie not found", "error", err)
			http.Error(w, "Invalid authentication state", http.StatusBadRequest)
			return
		}

		// Validate state parameter
		state := r.URL.Query().Get("state")
		if state == "" || state != stateCookie.Value {
			log.Error("state mismatch", "cookie", stateCookie.Value, "param", state)
			http.Error(w, "Invalid state parameter", http.StatusBadRequest)
			return
		}

		// Clear state cookie
		http.SetCookie(w, &http.Cookie{
			Name:     stateCookieName,
			Value:    "",
			Path:     "/",
			MaxAge:   -1,
			HttpOnly: true,
		})

		// Get authorization code
		code := r.URL.Query().Get("code")
		if code == "" {
			// Check for error response
			errorCode := r.URL.Query().Get("error")
			errorDesc := r.URL.Query().Get("error_description")
			log.Error("authorization failed", "error", errorCode, "description", errorDesc)
			http.Error(w, fmt.Sprintf("Authorization failed: %s", errorDesc), http.StatusBadRequest)
			return
		}

		// Exchange code for email
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		email, err := adapter.ExchangeCode(ctx, code)
		if err != nil {
			log.Error("failed to exchange code", "error", err)
			http.Error(w, "Failed to complete authentication", http.StatusInternalServerError)
			return
		}

		log.Info("user authenticated successfully", "email", email)

		// Set session cookie with user email
		http.SetCookie(w, &http.Cookie{
			Name:     sessionCookieName,
			Value:    email,
			Path:     "/",
			MaxAge:   int(cookieMaxAge / time.Second),
			HttpOnly: true,
			Secure:   r.TLS != nil,
			SameSite: http.SameSiteLaxMode,
		})

		// Redirect to dashboard
		redirectURL := "/dashboard"

		// Check if there's a redirect URL in the query params
		if redirect := r.URL.Query().Get("redirect"); redirect != "" {
			// Validate redirect URL to prevent open redirects
			if u, err := url.Parse(redirect); err == nil && u.Host == "" {
				redirectURL = redirect
			}
		}

		log.Debug("redirecting after authentication", "url", redirectURL, "email", email)
		http.Redirect(w, r, redirectURL, http.StatusFound)
	})
}

// LogoutHandler clears the session cookie and redirects to the home page.
func LogoutHandler(log hclog.Logger) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Clear session cookie
		http.SetCookie(w, &http.Cookie{
			Name:     sessionCookieName,
			Value:    "",
			Path:     "/",
			MaxAge:   -1,
			HttpOnly: true,
		})

		log.Debug("user logged out")

		// Redirect to home
		http.Redirect(w, r, "/", http.StatusFound)
	})
}

// generateRandomState generates a cryptographically secure random state string.
func generateRandomState() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("failed to generate random bytes: %w", err)
	}
	return base64.URLEncoding.EncodeToString(b), nil
}
