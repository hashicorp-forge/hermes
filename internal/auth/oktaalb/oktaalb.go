package oktaalb

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/hashicorp/go-hclog"
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

	// AWSRegion is the region of the AWS Application Load Balancer.
	AWSRegion string `hcl:"aws_region"`

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
		user, err := oa.verifyOIDCToken(r)
		if err != nil {
			oa.log.Error("error verifying OIDC token",
				"error", err,
				"method", r.Method,
				"path", r.URL.Path,
			)
			http.Error(w, `{"error": "Unauthorized"}`, http.StatusUnauthorized)
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
func (oa *OktaAuthorizer) verifyOIDCToken(r *http.Request) (string, error) {
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

	// Get the public key from the regional endpoint.
	url := fmt.Sprintf("https://public-keys.auth.elb.%s.amazonaws.com/%s",
		oa.cfg.AWSRegion, kid)
	resp, err := http.Get(url)
	if err != nil {
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

	return preferredUsername, nil
}
