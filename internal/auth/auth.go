package auth

import (
	"net/http"

	"github.com/hashicorp-forge/hermes/internal/config"
	pkgauth "github.com/hashicorp-forge/hermes/pkg/auth"
	dexadapter "github.com/hashicorp-forge/hermes/pkg/auth/adapters/dex"
	googleadapter "github.com/hashicorp-forge/hermes/pkg/auth/adapters/google"
	oktaadapter "github.com/hashicorp-forge/hermes/pkg/auth/adapters/okta"
	gw "github.com/hashicorp-forge/hermes/pkg/workspace/adapters/google"
	"github.com/hashicorp/go-hclog"
)

// AuthenticateRequest is middleware that authenticates an HTTP request using
// the appropriate authentication provider based on configuration.
func AuthenticateRequest(
	cfg config.Config, gwSvc *gw.Service, log hclog.Logger, next http.Handler,
) http.Handler {
	var provider pkgauth.Provider

	// Priority: Dex > Okta > Google
	// If Dex is configured and enabled, use Dex OIDC authentication.
	if cfg.Dex != nil && !cfg.Dex.Disabled {
		adapter, err := dexadapter.NewAdapter(*cfg.Dex, log)
		if err != nil {
			log.Error("error creating Dex authentication adapter", "error", err)
			return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				http.Error(w, "Internal server error", http.StatusInternalServerError)
			})
		}
		provider = adapter
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
