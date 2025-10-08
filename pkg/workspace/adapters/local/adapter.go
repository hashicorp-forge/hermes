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
// Supports two formats:
// 1. Single-file: document-id.md with YAML frontmatter
// 2. Directory-based: document-id/ with metadata.json + content.md
// Returns the path and whether it's a directory-based document.
func (a *Adapter) getDocumentPath(id string, isDraft bool) (string, bool) {
	basePath := a.docsPath
	if isDraft {
		basePath = a.draftsPath
	}

	// Check for directory-based format first (metadata.json + content.md)
	dirPath := filepath.Join(basePath, id)
	metadataPath := filepath.Join(dirPath, "metadata.json")
	if _, err := a.fs.Stat(metadataPath); err == nil {
		return dirPath, true
	}

	// Fall back to single-file format (document-id.md)
	return filepath.Join(basePath, id+".md"), false
}

// findDocumentPath searches for a document in both docs and drafts directories.
// Returns the path, whether it's a draft, whether it's directory-based, or an error if not found.
func (a *Adapter) findDocumentPath(id string) (string, bool, bool, error) {
	// Try docs first
	docPath, isDir := a.getDocumentPath(id, false)
	if isDir {
		// Check for metadata.json in directory
		metadataPath := filepath.Join(docPath, "metadata.json")
		if _, err := a.fs.Stat(metadataPath); err == nil {
			return docPath, false, true, nil
		}
	} else {
		// Check for single file
		if _, err := a.fs.Stat(docPath); err == nil {
			return docPath, false, false, nil
		}
	}

	// Try drafts
	draftPath, isDir := a.getDocumentPath(id, true)
	if isDir {
		// Check for metadata.json in directory
		metadataPath := filepath.Join(draftPath, "metadata.json")
		if _, err := a.fs.Stat(metadataPath); err == nil {
			return draftPath, true, true, nil
		}
	} else {
		// Check for single file
		if _, err := a.fs.Stat(draftPath); err == nil {
			return draftPath, true, false, nil
		}
	}

	return "", false, false, workspace.NotFoundError("document", id)
}

// getFolderPath returns the filesystem path for folder metadata.
func (a *Adapter) getFolderPath(id string) string {
	return filepath.Join(a.foldersPath, id+".json")
}
