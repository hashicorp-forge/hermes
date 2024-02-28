package jira

import (
	"errors"
	"fmt"
	"net/url"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/hashicorp-forge/hermes/internal/config"
)

// Service is a service for interacting with Jira.
type Service struct {
	// APIToken is the API token for authenticating to Jira.
	APIToken string

	// URL is the URL of the Jira instance.
	URL string

	// User is the user for authenticating to Jira.
	User string
}

// NewService creates a new Service.
func NewService(cfg config.Jira) (*Service, error) {
	// Validate configuration.
	if err := validate(cfg); err != nil {
		return nil, fmt.Errorf("error validating Jira configuration: %w", err)
	}

	// Verify that we can parse the Jira URL.
	u, err := url.Parse(cfg.URL)
	if err != nil {
		return nil, fmt.Errorf("error parsing Jira URL: %w", err)
	}

	// Verify scheme is HTTPS so the Jira credentials are secure.
	if u.Scheme != "https" {
		return nil, errors.New("only HTTPS URL scheme is allowed")
	}

	return &Service{
		APIToken: cfg.APIToken,
		URL:      cfg.URL,
		User:     cfg.User,
	}, nil
}

// validate validates the service configuration.
func validate(cfg config.Jira) error {
	return validation.ValidateStruct(&cfg,
		validation.Field(&cfg.APIToken, validation.Required),
		validation.Field(&cfg.URL, validation.Required),
		validation.Field(&cfg.User, validation.Required),
	)
}
