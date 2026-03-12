package auth

import (
	"net/http"

	"github.com/hashicorp-forge/hermes/internal/auth/google"
	"github.com/hashicorp-forge/hermes/internal/auth/microsoft"
	"github.com/hashicorp-forge/hermes/internal/auth/oidcalb"
	"github.com/hashicorp-forge/hermes/internal/auth/oktaalb"
	"github.com/hashicorp-forge/hermes/internal/config"
	gw "github.com/hashicorp-forge/hermes/pkg/googleworkspace"
	sp "github.com/hashicorp-forge/hermes/pkg/sharepointhelper"
	"github.com/hashicorp/go-hclog"
)

// AuthenticateRequest is middleware that authenticates an HTTP request.
func AuthenticateRequest(
	cfg config.Config, gwSvc *gw.Service, spSvc *sp.Service, log hclog.Logger, next http.Handler,
) http.Handler {
	// Priority 1: OIDC ALB (used by SharePoint deployments behind ALB).
	if cfg.OidcAlb != nil && !cfg.OidcAlb.Disabled {
		oa, err := oidcalb.New(*cfg.OidcAlb, log)
		if err != nil {
			log.Error("error creating OIDC ALB authenticator", "error", err)
			return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				http.Error(w, "Internal server error", http.StatusInternalServerError)
			})
		}

		return oa.EnforceOIDCAuth(
			http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				validateUserEmail(w, r, log)
				next.ServeHTTP(w, r)
			}))
	}

	// Priority 2: Okta (deprecated — legacy Google Hermes deployments).
	if cfg.Okta != nil && !cfg.Okta.Disabled {
		log.Warn("using deprecated 'okta' auth config — migrate to 'oidc_alb'")
		oa, err := oktaalb.New(*cfg.Okta, log)
		if err != nil {
			log.Error("error creating Okta ALB authenticator", "error", err)
			return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				http.Error(w, "Internal server error", http.StatusInternalServerError)
			})
		}

		return oa.EnforceOktaAuth(
			http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				validateUserEmail(w, r, log)
				next.ServeHTTP(w, r)
			}))
	}

	// Priority 3: Microsoft Auth (SharePoint without ALB).
	if cfg.SharePoint != nil {
		return microsoft.AuthenticateRequest(cfg.SharePoint, log, spSvc,
			http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				validateUserEmail(w, r, log)
				next.ServeHTTP(w, r)
			}))
	}

	// Priority 4: Google Auth (legacy Google Hermes).
	return google.AuthenticateRequest(gwSvc, log,
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			validateUserEmail(w, r, log)
			next.ServeHTTP(w, r)
		}))
}

// validateUserEmail validates that userEmail was set in the request's context.
// It responds with an internal server error if not found because this should
// be set by all authentication methods. userEmail is used for authorization in
// API endpoint implementations.
// Note: Skip validation for paths that bypass OIDC authentication.
func validateUserEmail(
	w http.ResponseWriter, r *http.Request, log hclog.Logger,
) {
	// Skip validation for paths that bypass OIDC authentication
	if oidcalb.ShouldBypassOIDC(r.URL.Path) {
		return
	}

	// Skip validation for the pre-authenticate route. Some auth providers, such
	// as SharePoint/Microsoft auth without ALB, must serve and handle
	// /authenticate before a user context exists.
	if r.URL.Path == "/authenticate" {
		return
	}

	if r.Context().Value("userEmail") == nil {
		log.Error("userEmail is not set in the request context",
			"method", r.Method,
			"path", r.URL.Path)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
}
