package auth

import (
	"fmt"
	"net/http"

	"github.com/hashicorp-forge/hermes/internal/config"
	pkgauth "github.com/hashicorp-forge/hermes/pkg/auth"
	googleadapter "github.com/hashicorp-forge/hermes/pkg/auth/adapters/google"
	oktaadapter "github.com/hashicorp-forge/hermes/pkg/auth/adapters/okta"
	gw "github.com/hashicorp-forge/hermes/pkg/workspace/adapters/google"
	"github.com/hashicorp/go-hclog"
)

const (
	// SessionCookieName is the name of the cookie used to store user session for Dex auth
	SessionCookieName = "hermes_session"
)

// DexSessionProvider wraps the Dex adapter and adds session cookie support.
type DexSessionProvider struct {
	log hclog.Logger
}

// NewDexSessionProvider creates a new Dex session provider.
func NewDexSessionProvider(log hclog.Logger) *DexSessionProvider {
	return &DexSessionProvider{log: log}
}

// Authenticate checks for a valid session cookie for Dex authentication.
func (p *DexSessionProvider) Authenticate(r *http.Request) (string, error) {
	// Check for session cookie
	cookie, err := r.Cookie(SessionCookieName)
	if err != nil {
		p.log.Debug("no session cookie found", "error", err)
		return "", fmt.Errorf("no session cookie found")
	}

	if cookie.Value == "" {
		p.log.Debug("empty session cookie")
		return "", fmt.Errorf("empty session cookie")
	}

	p.log.Debug("authenticated via session cookie", "email", cookie.Value)
	return cookie.Value, nil
}

// Name returns the provider name.
func (p *DexSessionProvider) Name() string {
	return "dex-session"
}

// AuthenticateRequest is middleware that authenticates an HTTP request using
// the appropriate authentication provider based on configuration.
func AuthenticateRequest(
	cfg config.Config, gwSvc *gw.Service, log hclog.Logger, next http.Handler,
) http.Handler {
	var provider pkgauth.Provider

	// Priority: Dex > Okta > Google
	// If Dex is configured and enabled, use Dex session-based authentication.
	if cfg.Dex != nil && !cfg.Dex.Disabled {
		// For Dex, we use session cookies instead of bearer tokens
		provider = NewDexSessionProvider(log)
	} else if cfg.Okta != nil && !cfg.Okta.Disabled {
		// If Okta is configured and enabled, use Okta authentication.
		oktaCfg := oktaadapter.Config{
			AuthServerURL: cfg.Okta.AuthServerURL,
			AWSRegion:     cfg.Okta.AWSRegion,
			ClientID:      cfg.Okta.ClientID,
			Disabled:      cfg.Okta.Disabled,
			JWTSigner:     cfg.Okta.JWTSigner,
		}

		adapter, err := oktaadapter.NewAdapter(oktaCfg, log)
		if err != nil {
			log.Error("error creating Okta authentication adapter", "error", err)
			return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				http.Error(w, "Internal server error", http.StatusInternalServerError)
			})
		}
		provider = adapter
	} else {
		// Use Google authentication.
		provider = googleadapter.NewAdapter(gwSvc)
	}

	// Wrap the handler with authentication middleware and an additional
	// safety check to ensure the user email is set.
	return pkgauth.Middleware(provider, log)(
		pkgauth.RequireUserEmail(log, next),
	)
}
