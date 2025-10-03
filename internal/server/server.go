package server

import (
	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/internal/jira"
	"github.com/hashicorp-forge/hermes/pkg/algolia"
	"github.com/hashicorp-forge/hermes/pkg/search"
	gw "github.com/hashicorp-forge/hermes/pkg/workspace/adapters/google"
	"github.com/hashicorp/go-hclog"
	"gorm.io/gorm"
)

// Server contains the server configuration.
type Server struct {
	// AlgoSearch is the Algolia search client for the server.
	// DEPRECATED: Use SearchProvider instead.
	AlgoSearch *algolia.Client

	// AlgoWrite is the Algolia write client for the server.
	// DEPRECATED: Use SearchProvider instead.
	AlgoWrite *algolia.Client

	// SearchProvider is the search backend (Algolia, Meilisearch, etc).
	// This is the preferred way to access search functionality.
	SearchProvider search.Provider

	// Config is the config for the server.
	Config *config.Config

	// DB is the database for the server.
	DB *gorm.DB

	// GWService is the Google Workspace service for the server.
	GWService *gw.Service

	// Jira is the Jira service for the server.
	Jira *jira.Service

	// Logger is the logger for the server.
	Logger hclog.Logger
}
