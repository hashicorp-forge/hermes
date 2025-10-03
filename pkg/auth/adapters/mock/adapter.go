// Package mock provides a mock authentication adapter for testing.
package mock

import (
	"fmt"
	"net/http"
)

// Adapter implements the auth.Provider interface for testing purposes.
// It can authenticate requests based on a fixed email or a custom header.
type Adapter struct {
	// MockEmail is the email to return for all authentication attempts.
	// If empty and UseHeader is false, authentication will fail.
	MockEmail string

	// UseHeader, when true, reads the email from the HTTP header specified by HeaderName.
	UseHeader bool

	// HeaderName is the HTTP header to read the email from when UseHeader is true.
	// Defaults to "X-Test-User-Email" if not specified.
	HeaderName string

	// FailAuthentication, when true, causes all authentication attempts to fail.
	// This is useful for testing authentication failure scenarios.
	FailAuthentication bool
}

// NewAdapter creates a new mock authentication adapter with sensible defaults.
func NewAdapter() *Adapter {
	return &Adapter{
		MockEmail:  "test@example.com",
		UseHeader:  true,
		HeaderName: "X-Test-User-Email",
	}
}

// NewAdapterWithEmail creates a mock adapter that always returns the specified email.
func NewAdapterWithEmail(email string) *Adapter {
	return &Adapter{
		MockEmail:  email,
		UseHeader:  false,
		HeaderName: "",
	}
}

// NewAdapterWithHeader creates a mock adapter that reads email from a custom header.
func NewAdapterWithHeader(headerName string) *Adapter {
	return &Adapter{
		MockEmail:  "",
		UseHeader:  true,
		HeaderName: headerName,
	}
}

// Authenticate validates the request and returns a mock authenticated email.
func (a *Adapter) Authenticate(r *http.Request) (string, error) {
	if a.FailAuthentication {
		return "", fmt.Errorf("mock authentication failed")
	}

	// If configured to use a header, try to read from it.
	if a.UseHeader {
		headerName := a.HeaderName
		if headerName == "" {
			headerName = "X-Test-User-Email"
		}

		email := r.Header.Get(headerName)
		if email != "" {
			return email, nil
		}
	}

	// Fall back to the mock email if configured.
	if a.MockEmail != "" {
		return a.MockEmail, nil
	}

	return "", fmt.Errorf("no authentication configured for mock adapter")
}

// Name returns the provider name for logging.
func (a *Adapter) Name() string {
	return "mock"
}
