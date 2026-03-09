// Package oidcalb provides generic OIDC authentication for AWS Application Load Balancer.
// This implementation supports any OIDC provider that works with AWS ALB.
package oidcalb

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/cenkalti/backoff/v4"
	"github.com/golang-jwt/jwt/v5"
	"github.com/hashicorp/go-hclog"
)

// AnonymousUserEmail is the email value set in context for requests that bypass OIDC authentication.
// This constant is used for static assets and add-in routes that don't require user authentication.
const AnonymousUserEmail = ""

// ShouldBypassOIDC determines whether the given request path should bypass OIDC verification.
// These paths must match the ALB listener rules that forward without OIDC.
func ShouldBypassOIDC(path string) bool {
	return strings.HasPrefix(path, "/addin/") ||
		strings.HasPrefix(path, "/static/") ||
		strings.HasPrefix(path, "/assets/") ||
		path == "/ping" ||
		path == "/favicon.ico"
}

// ALBAuthorizer implements OIDC authorization using AWS Application Load Balancer.
type ALBAuthorizer struct {
	// cfg is the configuration for the authorizer.
	cfg Config

	// log is the logger to use.
	log hclog.Logger
}

// Config is the configuration for OIDC ALB authorization.
type Config struct {
	// AuthServerURL is the URL of the OIDC authorization server.
	AuthServerURL string `hcl:"auth_server_url,optional"`

	// AWSRegion is the region of the AWS Application Load Balancer.
	AWSRegion string `hcl:"aws_region,optional"`

	// ClientID is the OIDC client ID.
	ClientID string `hcl:"client_id,optional"`

	// Disabled disables OIDC authorization.
	Disabled bool `hcl:"disabled,optional"`

	// JWTSigner is the trusted signer for the ALB JWT header.
	JWTSigner string `hcl:"jwt_signer,optional"`
}

// New returns a new ALB OIDC authorizer.
func New(cfg Config, l hclog.Logger) (*ALBAuthorizer, error) {
	return &ALBAuthorizer{
		cfg: cfg,
		log: l,
	}, nil
}

// EnforceOIDCAuth is HTTP middleware that enforces OIDC authorization.
func (aa *ALBAuthorizer) EnforceOIDCAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip OIDC verification for paths that bypass ALB OIDC authentication.
		// These paths must match the ALB listener rules that forward without OIDC.
		if ShouldBypassOIDC(r.URL.Path) {
			// Set AnonymousUserEmail in context. Downstream code should handle empty string
			// and skip user-specific operations for these paths.
			ctx := context.WithValue(r.Context(), "userEmail", AnonymousUserEmail)
			next.ServeHTTP(w, r.WithContext(ctx))
			return
		}

		user, err := aa.verifyOIDCToken(r)
		if err != nil {
			aa.log.Error("error verifying OIDC token",
				"error", err,
				"method", r.Method,
				"path", r.URL.Path,
			)
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		} else {
			// Set user email from the OIDC claims.
			ctx := context.WithValue(r.Context(), "userEmail", user)
			r = r.WithContext(ctx)

			next.ServeHTTP(w, r)
		}
	})
}

// verifyOIDCToken checks if the request is authorized and returns the user
// identity.
func (aa *ALBAuthorizer) verifyOIDCToken(r *http.Request) (string, error) {
	if aa.cfg.JWTSigner == "" {
		return "", fmt.Errorf("JWT signer not configured")
	}

	// Get the key ID from JWT headers (the kid field).
	encodedJWT := r.Header.Get("x-amzn-oidc-data")
	if encodedJWT == "" {
		return "", fmt.Errorf("no OIDC data header found")
	}
	split := strings.Split(encodedJWT, ".")
	if len(split) != 3 {
		return "", fmt.Errorf(
			"bad OIDC data: wrong number of substrings, found %d", len(split))
	}
	jwtHeaders := split[0]
	decodedJWTHeaders, err := base64.StdEncoding.DecodeString(jwtHeaders)
	if err != nil {
		return "", fmt.Errorf("error decoding JWT headers: %w", err)
	}
	var decodedJSON map[string]interface{}
	if err := json.Unmarshal(decodedJWTHeaders, &decodedJSON); err != nil {
		return "", fmt.Errorf("error unmarshaling JSON: %w", err)
	}
	kid, ok := decodedJSON["kid"].(string)
	if !ok {
		return "", fmt.Errorf("kid not found in decoded JSON")
	}

	// Validate signer.
	signer, ok := decodedJSON["signer"].(string)
	if !ok {
		return "", fmt.Errorf("signer not found in decoded JSON")
	}
	if signer != aa.cfg.JWTSigner {
		return "", fmt.Errorf("unexpected signer: %s", signer)
	}

	// Get the public key from the regional endpoint.
	url := fmt.Sprintf("https://public-keys.auth.elb.%s.amazonaws.com/%s",
		aa.cfg.AWSRegion, kid)
	var resp *http.Response
	// Execute the HTTP request with exponential backoff.
	bo := backoff.NewExponentialBackOff()
	bo.MaxElapsedTime = 2 * time.Minute
	err = backoff.RetryNotify(func() error {
		resp, err = http.Get(url)
		return err
	}, bo,
		func(err error, d time.Duration) {
			aa.log.Warn("error getting ELB public key (retrying)",
				"error", err,
				"delay", d,
			)
		},
	)
	if err != nil || resp == nil {
		return "", fmt.Errorf("error getting ELB public key: %w", err)
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("error reading response body: %w", err)
	}
	pubKey, err := jwt.ParseECPublicKeyFromPEM(body)
	if err != nil {
		return "", fmt.Errorf("error parsing public key: %w", err)
	}

	// Get the token payload.
	token, err := jwt.Parse(
		encodedJWT, func(token *jwt.Token) (interface{}, error) {
			if _, ok := (token.Method.(*jwt.SigningMethodECDSA)); !ok {
				return "", fmt.Errorf(
					"unexpected signing method: %v", token.Header["alg"])
			}
			return pubKey, nil
		}, jwt.WithPaddingAllowed())
	if err != nil {
		return "", fmt.Errorf("error parsing JWT: %w", err)
	}

	// Verify claims.
	var preferredUsername string
	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		prefRaw, ok := claims["preferred_username"]
		if !ok {
			return "", fmt.Errorf("preferred_username claim not found")
		}
		preferredUsername, ok = prefRaw.(string)
		if !ok {
			return "", fmt.Errorf("preferred_username claim is invalid")
		}
	} else {
		return "", fmt.Errorf("claims not found")
	}

	if preferredUsername == "" {
		return "", fmt.Errorf("preferred_username claim is empty")
	}

	if !strings.Contains(preferredUsername, "@") {
		///check emailAddress claim
		var emailAddress string
		if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
			emailRaw, ok := claims["emailAddress"]
			if !ok {
				return "", fmt.Errorf("email claim not found")
			}
			emailAddress, ok = emailRaw.(string)
			if !ok {
				return "", fmt.Errorf("email claim is invalid")
			}
		} else {
			return "", fmt.Errorf("claims not found")
		}
		if emailAddress == "" {
			return "", fmt.Errorf("email claim is empty")
		}
		preferredUsername = emailAddress
	}

	return preferredUsername, nil
}
