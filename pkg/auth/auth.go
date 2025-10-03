package auth

import (
	"context"
	"fmt"
	"net/http"

	"github.com/hashicorp/go-hclog"
)

// Provider is the interface that all authentication providers must implement.
type Provider interface {
	// Authenticate validates the request and returns the authenticated user email.
	// Returns the user's email address and an error if authentication fails.
	Authenticate(r *http.Request) (string, error)

	// Name returns the provider name for logging and identification.
	Name() string
}

// contextKey is a typed key for context values to avoid collisions.
type contextKey string

// UserEmailKey is the context key for storing the authenticated user's email.
const UserEmailKey contextKey = "userEmail"

// Middleware creates HTTP middleware that authenticates requests using the provided
// authentication provider. On successful authentication, the user's email is stored
// in the request context using UserEmailKey.
func Middleware(provider Provider, log hclog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			email, err := provider.Authenticate(r)
			if err != nil {
				log.Error("authentication failed",
					"provider", provider.Name(),
					"error", err,
					"method", r.Method,
					"path", r.URL.Path)
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}

			if email == "" {
				log.Error("authentication returned empty email",
					"provider", provider.Name(),
					"method", r.Method,
					"path", r.URL.Path)
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}

			// Set userEmail in request context.
			ctx := context.WithValue(r.Context(), UserEmailKey, email)
			r = r.WithContext(ctx)

			next.ServeHTTP(w, r)
		})
	}
}

// GetUserEmail safely extracts the authenticated user's email from the request context.
// Returns the email and a boolean indicating whether the email was found.
func GetUserEmail(ctx context.Context) (string, bool) {
	email, ok := ctx.Value(UserEmailKey).(string)
	return email, ok
}

// MustGetUserEmail extracts the authenticated user's email from the request context.
// Panics if the email is not found. Should only be used in handlers that are wrapped
// with authentication middleware.
func MustGetUserEmail(ctx context.Context) string {
	email, ok := GetUserEmail(ctx)
	if !ok {
		panic("userEmail not found in context - handler must be wrapped with auth middleware")
	}
	return email
}

// RequireUserEmail is middleware that ensures a user email is present in the context.
// This can be used as an additional safety check for handlers that must be authenticated.
func RequireUserEmail(log hclog.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if _, ok := GetUserEmail(r.Context()); !ok {
			log.Error("userEmail not found in context",
				"method", r.Method,
				"path", r.URL.Path)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// GetUserEmailOrError extracts the user email from context and returns an error if not found.
// Useful for handlers that want to return proper HTTP errors.
func GetUserEmailOrError(ctx context.Context) (string, error) {
	email, ok := GetUserEmail(ctx)
	if !ok {
		return "", fmt.Errorf("userEmail not found in context")
	}
	return email, nil
}
