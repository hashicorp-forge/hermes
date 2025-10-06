// Package dex provides a Dex OIDC authentication adapter for Hermes.
package dex

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/coreos/go-oidc/v3/oidc"
	"github.com/hashicorp/go-hclog"
	"golang.org/x/oauth2"
)

// Config is the configuration for Dex OIDC authentication.
type Config struct {
	// IssuerURL is the URL of the Dex OIDC issuer (e.g., http://localhost:5556/dex)
	IssuerURL string `hcl:"issuer_url,optional"`

	// ClientID is the OIDC client ID for Hermes
	ClientID string `hcl:"client_id,optional"`

	// ClientSecret is the OIDC client secret for Hermes
	ClientSecret string `hcl:"client_secret,optional"`

	// RedirectURL is the callback URL for OIDC authentication
	RedirectURL string `hcl:"redirect_url,optional"`

	// Disabled disables Dex authorization
	Disabled bool `hcl:"disabled,optional"`
}

// Adapter implements the auth.Provider interface using Dex OIDC.
type Adapter struct {
	cfg      Config
	log      hclog.Logger
	verifier *oidc.IDTokenVerifier
	provider *oidc.Provider
}

// NewAdapter creates a new Dex OIDC authentication adapter.
func NewAdapter(cfg Config, log hclog.Logger) (*Adapter, error) {
	if cfg.IssuerURL == "" {
		return nil, fmt.Errorf("issuer URL not configured")
	}
	if cfg.ClientID == "" {
		return nil, fmt.Errorf("client ID not configured")
	}

	// Create OIDC provider
	ctx := context.Background()
	provider, err := oidc.NewProvider(ctx, cfg.IssuerURL)
	if err != nil {
		return nil, fmt.Errorf("failed to create OIDC provider: %w", err)
	}

	// Create ID token verifier
	verifier := provider.Verifier(&oidc.Config{
		ClientID: cfg.ClientID,
	})

	return &Adapter{
		cfg:      cfg,
		log:      log,
		verifier: verifier,
		provider: provider,
	}, nil
}

// Authenticate validates the OIDC token from the Authorization header
// and returns the authenticated user's email address.
func (a *Adapter) Authenticate(r *http.Request) (string, error) {
	// Get the bearer token from the Authorization header
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return "", fmt.Errorf("no Authorization header found")
	}

	// Extract the token from "Bearer <token>"
	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || parts[0] != "Bearer" {
		return "", fmt.Errorf("invalid Authorization header format")
	}
	rawIDToken := parts[1]

	// Verify the ID token
	idToken, err := a.verifier.Verify(r.Context(), rawIDToken)
	if err != nil {
		return "", fmt.Errorf("failed to verify ID token: %w", err)
	}

	// Extract claims
	var claims struct {
		Email         string `json:"email"`
		EmailVerified bool   `json:"email_verified"`
	}

	if err := idToken.Claims(&claims); err != nil {
		return "", fmt.Errorf("failed to parse ID token claims: %w", err)
	}

	if claims.Email == "" {
		return "", fmt.Errorf("email claim not found in ID token")
	}

	a.log.Debug("successfully authenticated user via Dex",
		"email", claims.Email,
		"email_verified", claims.EmailVerified)

	return claims.Email, nil
}

// Name returns the provider name for logging.
func (a *Adapter) Name() string {
	return "dex"
}

// GetAuthCodeURL returns the URL for initiating the OIDC authorization code flow.
// This is useful for web applications that need to redirect users to the Dex login page.
func (a *Adapter) GetAuthCodeURL(state string) string {
	endpoint := a.provider.Endpoint()
	return fmt.Sprintf("%s?client_id=%s&redirect_uri=%s&response_type=code&scope=openid+email+profile&state=%s",
		endpoint.AuthURL,
		a.cfg.ClientID,
		a.cfg.RedirectURL,
		state,
	)
}

// ExchangeCode exchanges an authorization code for an ID token.
// This completes the OIDC authorization code flow after the user is redirected back.
func (a *Adapter) ExchangeCode(ctx context.Context, code string) (string, error) {
	// Create OAuth2 config
	oauth2Config := &oauth2.Config{
		ClientID:     a.cfg.ClientID,
		ClientSecret: a.cfg.ClientSecret,
		RedirectURL:  a.cfg.RedirectURL,
		Endpoint:     a.provider.Endpoint(),
		Scopes:       []string{oidc.ScopeOpenID, "email", "profile"},
	}

	oauth2Token, err := oauth2Config.Exchange(ctx, code)
	if err != nil {
		return "", fmt.Errorf("failed to exchange authorization code: %w", err)
	}

	// Extract ID token from OAuth2 token response
	rawIDToken, ok := oauth2Token.Extra("id_token").(string)
	if !ok {
		return "", fmt.Errorf("no id_token in token response")
	}

	// Verify the ID token
	idToken, err := a.verifier.Verify(ctx, rawIDToken)
	if err != nil {
		return "", fmt.Errorf("failed to verify ID token from exchange: %w", err)
	}

	// Extract email claim
	var claims struct {
		Email string `json:"email"`
	}
	if err := idToken.Claims(&claims); err != nil {
		return "", fmt.Errorf("failed to parse claims from exchanged token: %w", err)
	}

	return claims.Email, nil
}

// Ensure Adapter implements the auth.Provider interface at compile time.
var _ interface {
	Authenticate(*http.Request) (string, error)
	Name() string
} = (*Adapter)(nil)
