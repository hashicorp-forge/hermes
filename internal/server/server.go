package server

import (
	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/internal/email"
	"github.com/hashicorp-forge/hermes/internal/jira"
	"github.com/hashicorp-forge/hermes/pkg/algolia"
	gw "github.com/hashicorp-forge/hermes/pkg/googleworkspace"
	"github.com/hashicorp-forge/hermes/pkg/models"
	sp "github.com/hashicorp-forge/hermes/pkg/sharepointhelper"
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

	// MSGraphService is the Microsoft Graph service for the server.
	// MSGraphService *microsoftgraph.Service

	//Sharepoint
	SharePoint *sp.Service
}

// GetEmailSender returns the appropriate email.EmailSender based on which
// backend is configured (SharePoint or Google Workspace).
func (s Server) GetEmailSender() email.EmailSender {
	if s.SharePoint != nil {
		return s.SharePoint
	}
	return &gw.EmailSenderAdapter{Svc: s.GWService}
}

// IsSharePoint returns true when the server is configured for a SharePoint
// backend, false when it is configured for Google Workspace.
func (s Server) IsSharePoint() bool {
	return s.SharePoint != nil
}

// NewDocumentByFileID returns a models.Document with the correct file-ID
// field populated based on the configured backend.
func (s Server) NewDocumentByFileID(fileID string) models.Document {
	return models.NewDocumentByFileID(fileID, s.IsSharePoint())
}
