package server

import (
	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/internal/jira"
	"github.com/hashicorp-forge/hermes/pkg/search"
	"github.com/hashicorp-forge/hermes/pkg/workspace"
	"github.com/hashicorp/go-hclog"
	"gorm.io/gorm"
)

// Server contains the server configuration.
type Server struct {
	// SearchProvider is the search backend (Algolia, Meilisearch, etc).
	// This is the preferred way to access search functionality.
	SearchProvider search.Provider

	// WorkspaceProvider is the workspace/storage backend (Google Drive, local, etc).
	// This abstracts document storage and collaboration operations like file management
	// and permissions.
	WorkspaceProvider workspace.Provider

	// Config is the config for the server.
	Config *config.Config

	// DB is the database for the server.
	DB *gorm.DB

	// Jira is the Jira service for the server.
	Jira *jira.Service

	// Logger is the logger for the server.
	Logger hclog.Logger
}
