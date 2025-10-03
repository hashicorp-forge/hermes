package server

import (
	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/internal/jira"
	"github.com/hashicorp-forge/hermes/pkg/algolia"
	gw "github.com/hashicorp-forge/hermes/pkg/storage/adapters/google"
	"github.com/hashicorp/go-hclog"
	"gorm.io/gorm"
)

// Server contains the server configuration.
type Server struct {
	// AlgoSearch is the Algolia search client for the server.
	AlgoSearch *algolia.Client

	// AlgoWrite is the Algolia write client for the server.
	AlgoWrite *algolia.Client

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
