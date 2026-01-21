// Package okta provides an Okta authentication adapter for Hermes using AWS ALB JWT tokens.
package okta

import (
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

// Config is the configuration for Okta authentication via AWS ALB.
type Config struct {
	// AuthServerURL is the URL of the Okta authorization server.
	AuthServerURL string `hcl:"auth_server_url,optional"`

	// AWSRegion is the region of the AWS Application Load Balancer.
	AWSRegion string `hcl:"aws_region,optional"`

	// ClientID is the Okta client ID.
	ClientID string `hcl:"client_id,optional"`

	// Disabled disables Okta authorization.
	Disabled bool `hcl:"disabled,optional"`

	// JWTSigner is the trusted signer for the ALB JWT header.
	JWTSigner string `hcl:"jwt_signer,optional"`
}

// Adapter implements the auth.Provider interface using Okta via AWS ALB JWT tokens.
type Adapter struct {
	cfg Config
	log hclog.Logger
}

// NewAdapter creates a new Okta authentication adapter.
func NewAdapter(cfg Config, log hclog.Logger) (*Adapter, error) {
	if cfg.JWTSigner == "" {
		return nil, fmt.Errorf("JWT signer not configured")
	}
	if cfg.AWSRegion == "" {
		return nil, fmt.Errorf("AWS region not configured")
	}

	return &Adapter{
		cfg: cfg,
		log: log,
	}, nil
}

// Authenticate validates the OIDC token from the AWS ALB headers
// and returns the authenticated user's email address.
func (a *Adapter) Authenticate(r *http.Request) (string, error) {
	// Get the encoded JWT from the ALB header.
	encodedJWT := r.Header.Get("x-amzn-oidc-data")
	if encodedJWT == "" {
		return "", fmt.Errorf("no OIDC data header found")
	}

	// Parse JWT to get the key ID.
	split := strings.Split(encodedJWT, ".")
	if len(split) != 3 {
		return "", fmt.Errorf("bad OIDC data: expected 3 parts, got %d", len(split))
	}

	// Decode JWT headers.
	jwtHeaders := split[0]
	decodedJWTHeaders, err := base64.RawURLEncoding.DecodeString(jwtHeaders)
	if err != nil {
		return "", fmt.Errorf("error decoding JWT headers: %w", err)
	}

	var decodedJSON map[string]interface{}
	if err := json.Unmarshal(decodedJWTHeaders, &decodedJSON); err != nil {
		return "", fmt.Errorf("error unmarshaling JWT headers: %w", err)
	}

	// Get key ID.
	kid, ok := decodedJSON["kid"].(string)
	if !ok {
		return "", fmt.Errorf("kid not found in JWT headers")
	}

	// Validate signer.
	signer, ok := decodedJSON["signer"].(string)
	if !ok {
		return "", fmt.Errorf("signer not found in JWT headers")
	}
	if signer != a.cfg.JWTSigner {
		return "", fmt.Errorf("unexpected signer: %s (expected %s)", signer, a.cfg.JWTSigner)
	}

	// Get the public key from AWS.
	pubKey, err := a.getPublicKey(kid)
	if err != nil {
		return "", fmt.Errorf("error getting public key: %w", err)
	}

	// Parse and validate the token.
	token, err := jwt.Parse(
		encodedJWT,
		func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodECDSA); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return pubKey, nil
		},
		jwt.WithPaddingAllowed(),
	)
	if err != nil {
		return "", fmt.Errorf("error parsing JWT: %w", err)
	}

	// Extract claims.
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return "", fmt.Errorf("invalid token claims")
	}

	prefRaw, ok := claims["preferred_username"]
	if !ok {
		return "", fmt.Errorf("preferred_username claim not found")
	}

	preferredUsername, ok := prefRaw.(string)
	if !ok {
		return "", fmt.Errorf("preferred_username claim is not a string")
	}

	if preferredUsername == "" {
		return "", fmt.Errorf("preferred_username claim is empty")
	}

	return preferredUsername, nil
}

// getPublicKey fetches the public key from AWS ALB for the given key ID.
func (a *Adapter) getPublicKey(kid string) (interface{}, error) {
	url := fmt.Sprintf("https://public-keys.auth.elb.%s.amazonaws.com/%s",
		a.cfg.AWSRegion, kid)

	var resp *http.Response
	var err error

	// Execute the HTTP request with exponential backoff.
	bo := backoff.NewExponentialBackOff()
	bo.MaxElapsedTime = 2 * time.Minute

	err = backoff.RetryNotify(
		func() error {
			resp, err = http.Get(url)
			return err
		},
		bo,
		func(err error, d time.Duration) {
			a.log.Warn("error getting ELB public key (retrying)",
				"error", err,
				"delay", d,
			)
		},
	)
	if err != nil || resp == nil {
		return nil, fmt.Errorf("error fetching public key: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error reading response body: %w", err)
	}

	pubKey, err := jwt.ParseECPublicKeyFromPEM(body)
	if err != nil {
		return nil, fmt.Errorf("error parsing public key: %w", err)
	}

	return pubKey, nil
}

// Name returns the provider name for logging.
func (a *Adapter) Name() string {
	return "okta"
}

// Ensure Adapter implements the auth.Provider interface at compile time.
var _ interface {
	Authenticate(*http.Request) (string, error)
	Name() string
} = (*Adapter)(nil)
