// Package local provides a local workspace storage adapter.
package local

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"path/filepath"

	"github.com/hashicorp-forge/hermes/pkg/workspace"
)

// Adapter provides local workspace document storage.
type Adapter struct {
	basePath      string
	docsPath      string
	draftsPath    string
	foldersPath   string
	usersPath     string
	tokensPath    string
	fs            FileSystem
	smtpConfig    *SMTPConfig
	metadataStore *MetadataStore
}

// NewAdapter creates a new filesystem adapter.
func NewAdapter(cfg *Config) (*Adapter, error) {
	// Validate configuration and set defaults
	if err := cfg.Validate(); err != nil {
		return nil, fmt.Errorf("invalid configuration: %w", err)
	}

	// Create directories if they don't exist
	dirs := []string{cfg.DocsPath, cfg.DraftsPath, cfg.FoldersPath}
	for _, dir := range dirs {
		if err := cfg.FileSystem.MkdirAll(dir, 0755); err != nil {
			return nil, fmt.Errorf("failed to create directory %s: %w", dir, err)
		}
	}

	metadataStore, err := NewMetadataStore(cfg.BasePath, cfg.FileSystem)
	if err != nil {
		return nil, fmt.Errorf("failed to create metadata store: %w", err)
	}

	return &Adapter{
		basePath:      cfg.BasePath,
		docsPath:      cfg.DocsPath,
		draftsPath:    cfg.DraftsPath,
		foldersPath:   cfg.FoldersPath,
		usersPath:     cfg.UsersPath,
		tokensPath:    cfg.TokensPath,
		fs:            cfg.FileSystem,
		smtpConfig:    cfg.SMTPConfig,
		metadataStore: metadataStore,
	}, nil
}

// DocumentStorage returns the document storage implementation.
func (a *Adapter) DocumentStorage() workspace.DocumentStorage {
	return &documentStorage{adapter: a}
}

// PeopleService returns the people service implementation.
func (a *Adapter) PeopleService() workspace.PeopleService {
	return &peopleService{adapter: a}
}

// NotificationService returns the notification service implementation.
func (a *Adapter) NotificationService() workspace.NotificationService {
	return &notificationService{adapter: a}
}

// AuthService returns the auth service implementation.
func (a *Adapter) AuthService() workspace.AuthService {
	return &authService{adapter: a}
}

// generateID generates a unique identifier.
func generateID() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}

// getDocumentPath returns the filesystem path for a document.
func (a *Adapter) getDocumentPath(id string, isDraft bool) string {
	basePath := a.docsPath
	if isDraft {
		basePath = a.draftsPath
	}
	return filepath.Join(basePath, id+".md")
}

// findDocumentPath searches for a document in both docs and drafts directories.
// Returns the path and whether it's a draft, or an error if not found.
func (a *Adapter) findDocumentPath(id string) (string, bool, error) {
	// Try docs first
	docPath := a.getDocumentPath(id, false)
	if _, err := a.fs.Stat(docPath); err == nil {
		return docPath, false, nil
	}

	// Try drafts
	draftPath := a.getDocumentPath(id, true)
	if _, err := a.fs.Stat(draftPath); err == nil {
		return draftPath, true, nil
	}

	return "", false, workspace.NotFoundError("document", id)
}

// getFolderPath returns the filesystem path for folder metadata.
func (a *Adapter) getFolderPath(id string) string {
	return filepath.Join(a.foldersPath, id+".json")
}
