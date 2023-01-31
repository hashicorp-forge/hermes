package oktaalb

import (
	"context"
	"fmt"
	"net/http"

	"github.com/hashicorp/go-hclog"
	verifier "github.com/okta/okta-jwt-verifier-golang"
)

const (
	audience = "api://default"
)

// OktaAuthorizer implements authorization using Okta.
type OktaAuthorizer struct {
	// cfg is the configuration for the authorizer.
	cfg Config

	// log is the logger to use.
	log hclog.Logger
}

// Config is the configuration for Okta authorizatioon.
type Config struct {
	// AuthServerURL is the URL of the Okta authorization server.
	AuthServerURL string `hcl:"auth_server_url,optional"`

	// ClientID is the Okta client ID.
	ClientID string `hcl:"client_id,optional"`

	// Disabled disables Okta authorization.
	Disabled bool `hcl:"disabled,optional"`
}

// New returns a new Okta authorizer.
func New(cfg Config, l hclog.Logger) (*OktaAuthorizer, error) {
	return &OktaAuthorizer{
		cfg: cfg,
		log: l,
	}, nil
}

// EnforceOktaAuth is HTTP middleware that enforces Okta authorization.
func (oa *OktaAuthorizer) EnforceOktaAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := r.Header.Get("x-amzn-oidc-identity")
		if id == "" {
			oa.log.Error("no identity header found",
				"method", r.Method,
				"path", r.URL.Path,
			)
			http.Error(w, `{"error": "Unauthorized"}`, http.StatusUnauthorized)
			return
		}

		jwt, err := oa.verifyOIDCToken(r)
		if err != nil {
			oa.log.Error("error validating OIDC token",
				"error", err,
				"method", r.Method,
				"path", r.URL.Path,
			)
			http.Error(w, `{"error": "Unauthorized"}`, http.StatusUnauthorized)
			return
		} else {
			// Set user email from the OIDC claims.
			ctx := context.WithValue(r.Context(), "userEmail", jwt.Claims["sub"])
			r = r.WithContext(ctx)

			next.ServeHTTP(w, r)
		}
	})
}

// verifyOIDCToken checks if the request is authorized.
func (oa *OktaAuthorizer) verifyOIDCToken(r *http.Request) (*verifier.Jwt, error) {
	tok := r.Header.Get("x-amzn-oidc-accesstoken")
	if tok == "" {
		oa.log.Error("no access token header found")
		return nil, fmt.Errorf("no access token header found")
	}

	return oa.verifyAccessToken(tok)
}

// verifyAccessToken verifies an Okta access token.
func (oa *OktaAuthorizer) verifyAccessToken(t string) (*verifier.Jwt, error) {
	claims := map[string]string{}
	claims["aud"] = audience
	claims["cid"] = oa.cfg.ClientID
	jv := verifier.JwtVerifier{
		Issuer:           oa.cfg.AuthServerURL,
		ClaimsToValidate: claims,
	}

	resp, err := jv.New().VerifyAccessToken(t)
	if err != nil {
		return nil, err
	}
	if resp == nil {
		return nil, fmt.Errorf("jwt verifier was nil")
	}

	return resp, nil
}
