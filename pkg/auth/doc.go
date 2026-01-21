// Package auth provides authentication abstractions and adapters for the Hermes service.
//
// This package defines the Provider interface that all authentication mechanisms must
// implement, along with middleware and helper functions for working with authenticated
// requests.
//
// # Architecture
//
// The auth package uses an adapter pattern to support multiple authentication providers:
//   - Google OAuth (via Google access tokens)
//   - Okta (via AWS ALB JWT tokens)
//   - Mock (for testing)
//
// # Usage
//
// To use an authentication provider in your HTTP handlers:
//
//	import (
//	    pkgauth "github.com/hashicorp-forge/hermes/pkg/auth"
//	    googleadapter "github.com/hashicorp-forge/hermes/pkg/auth/adapters/google"
//	)
//
//	// Create an auth provider
//	provider := googleadapter.NewAdapter(googleService)
//
//	// Wrap your handler with auth middleware
//	handler := pkgauth.Middleware(provider, logger)(myHandler)
//
//	// In your handler, extract the authenticated user email
//	func myHandler(w http.ResponseWriter, r *http.Request) {
//	    email, ok := pkgauth.GetUserEmail(r.Context())
//	    if !ok {
//	        http.Error(w, "Unauthorized", http.StatusInternalServerError)
//	        return
//	    }
//	    // Use email for authorization...
//	}
package auth
