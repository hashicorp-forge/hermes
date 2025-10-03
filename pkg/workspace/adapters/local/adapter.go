// Package localworkspace provides a local workspace storage adapter.
package localworkspace

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/hashicorp-forge/hermes/pkg/storage"
)

// Adapter provides local local workspace document storage.
type Adapter struct {
	basePath      string
	docsPath      string
	draftsPath    string
	foldersPath   string
	metadataStore *MetadataStore
}

// Config contains filesystem adapter configuration.
type Config struct {
	// BasePath is the root directory for all storage.
	BasePath string

	// DocsPath is the directory for published documents.
	DocsPath string

	// DraftsPath is the directory for draft documents.
	DraftsPath string

	// FoldersPath is the directory for folder metadata.
	FoldersPath string
}

// NewAdapter creates a new filesystem adapter.
func NewAdapter(cfg *Config) (*Adapter, error) {
	if cfg.BasePath == "" {
		return nil, storage.InvalidInputError("BasePath", "cannot be empty")
	}

	// Set defaults if not provided
	if cfg.DocsPath == "" {
		cfg.DocsPath = filepath.Join(cfg.BasePath, "docs")
	}
	if cfg.DraftsPath == "" {
		cfg.DraftsPath = filepath.Join(cfg.BasePath, "drafts")
	}
	if cfg.FoldersPath == "" {
		cfg.FoldersPath = filepath.Join(cfg.BasePath, "folders")
	}

	// Create directories if they don't exist
	dirs := []string{cfg.DocsPath, cfg.DraftsPath, cfg.FoldersPath}
	for _, dir := range dirs {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return nil, fmt.Errorf("failed to create directory %s: %w", dir, err)
		}
	}

	metadataStore, err := NewMetadataStore(cfg.BasePath)
	if err != nil {
		return nil, fmt.Errorf("failed to create metadata store: %w", err)
	}

	return &Adapter{
		basePath:      cfg.BasePath,
		docsPath:      cfg.DocsPath,
		draftsPath:    cfg.DraftsPath,
		foldersPath:   cfg.FoldersPath,
		metadataStore: metadataStore,
	}, nil
}

// DocumentStorage returns the document storage implementation.
func (a *Adapter) DocumentStorage() storage.DocumentStorage {
	return &documentStorage{adapter: a}
}

// PeopleService returns the people service implementation.
func (a *Adapter) PeopleService() storage.PeopleService {
	return &peopleService{adapter: a}
}

// NotificationService returns the notification service implementation.
func (a *Adapter) NotificationService() storage.NotificationService {
	return &notificationService{adapter: a}
}

// AuthService returns the auth service implementation.
func (a *Adapter) AuthService() storage.AuthService {
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

// getFolderPath returns the filesystem path for folder metadata.
func (a *Adapter) getFolderPath(id string) string {
	return filepath.Join(a.foldersPath, id+".json")
}

// documentStorage implements storage.DocumentStorage.
type documentStorage struct {
	adapter *Adapter
}

// GetDocument retrieves a document by ID.
func (ds *documentStorage) GetDocument(ctx context.Context, id string) (*storage.Document, error) {
	// Try to load metadata
	meta, err := ds.adapter.metadataStore.Get(id)
	if err != nil {
		return nil, storage.NotFoundError("document", id)
	}

	// Determine if it's a draft
	isDraft := meta.ParentFolderID == "drafts" || strings.Contains(meta.ParentFolderID, "draft")

	// Load content
	docPath := ds.adapter.getDocumentPath(id, isDraft)
	content, err := os.ReadFile(docPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, storage.NotFoundError("document", id)
		}
		return nil, fmt.Errorf("failed to read document: %w", err)
	}

	return &storage.Document{
		ID:             id,
		Name:           meta.Name,
		Content:        string(content),
		MimeType:       "text/markdown",
		ParentFolderID: meta.ParentFolderID,
		CreatedTime:    meta.CreatedTime,
		ModifiedTime:   meta.ModifiedTime,
		Owner:          meta.Owner,
		ThumbnailURL:   meta.ThumbnailURL,
		Metadata:       meta.Metadata,
		Trashed:        meta.Trashed,
	}, nil
}

// CreateDocument creates a new document.
func (ds *documentStorage) CreateDocument(ctx context.Context, doc *storage.DocumentCreate) (*storage.Document, error) {
	if doc.Name == "" {
		return nil, storage.InvalidInputError("Name", "cannot be empty")
	}

	// Generate unique ID
	id := generateID()

	// If TemplateID is provided, copy content from template
	content := doc.Content
	if doc.TemplateID != "" {
		templateDoc, err := ds.GetDocument(ctx, doc.TemplateID)
		if err != nil {
			return nil, fmt.Errorf("failed to get template document: %w", err)
		}
		content = templateDoc.Content
	}

	now := time.Now()
	isDraft := doc.ParentFolderID == "drafts" || strings.Contains(doc.ParentFolderID, "draft")

	// Write content to file
	docPath := ds.adapter.getDocumentPath(id, isDraft)
	if err := os.WriteFile(docPath, []byte(content), 0644); err != nil {
		return nil, fmt.Errorf("failed to write document: %w", err)
	}

	// Store metadata
	meta := &DocumentMetadata{
		ID:             id,
		Name:           doc.Name,
		ParentFolderID: doc.ParentFolderID,
		CreatedTime:    now,
		ModifiedTime:   now,
		Owner:          doc.Owner,
		Metadata:       doc.Metadata,
	}

	if err := ds.adapter.metadataStore.Set(id, meta); err != nil {
		// Clean up document file on metadata failure
		os.Remove(docPath)
		return nil, fmt.Errorf("failed to store metadata: %w", err)
	}

	return &storage.Document{
		ID:             id,
		Name:           doc.Name,
		Content:        content,
		MimeType:       "text/markdown",
		ParentFolderID: doc.ParentFolderID,
		CreatedTime:    now,
		ModifiedTime:   now,
		Owner:          doc.Owner,
		Metadata:       doc.Metadata,
	}, nil
}

// UpdateDocument updates an existing document.
func (ds *documentStorage) UpdateDocument(ctx context.Context, id string, updates *storage.DocumentUpdate) (*storage.Document, error) {
	meta, err := ds.adapter.metadataStore.Get(id)
	if err != nil {
		return nil, storage.NotFoundError("document", id)
	}

	isDraft := meta.ParentFolderID == "drafts" || strings.Contains(meta.ParentFolderID, "draft")

	// Update fields
	if updates.Name != nil {
		meta.Name = *updates.Name
	}
	if updates.ParentFolderID != nil {
		// Handle move between docs/drafts
		oldPath := ds.adapter.getDocumentPath(id, isDraft)
		newIsDraft := *updates.ParentFolderID == "drafts" || strings.Contains(*updates.ParentFolderID, "draft")
		newPath := ds.adapter.getDocumentPath(id, newIsDraft)

		if oldPath != newPath {
			if err := os.Rename(oldPath, newPath); err != nil {
				return nil, fmt.Errorf("failed to move document: %w", err)
			}
		}

		meta.ParentFolderID = *updates.ParentFolderID
		isDraft = newIsDraft
	}
	if updates.Content != nil {
		docPath := ds.adapter.getDocumentPath(id, isDraft)
		if err := os.WriteFile(docPath, []byte(*updates.Content), 0644); err != nil {
			return nil, fmt.Errorf("failed to update document content: %w", err)
		}
	}
	if updates.Metadata != nil {
		if meta.Metadata == nil {
			meta.Metadata = make(map[string]any)
		}
		for k, v := range updates.Metadata {
			meta.Metadata[k] = v
		}
	}

	meta.ModifiedTime = time.Now()

	if err := ds.adapter.metadataStore.Set(id, meta); err != nil {
		return nil, fmt.Errorf("failed to update metadata: %w", err)
	}

	// Reload full document
	return ds.GetDocument(ctx, id)
}

// DeleteDocument deletes a document.
func (ds *documentStorage) DeleteDocument(ctx context.Context, id string) error {
	meta, err := ds.adapter.metadataStore.Get(id)
	if err != nil {
		return storage.NotFoundError("document", id)
	}

	isDraft := meta.ParentFolderID == "drafts" || strings.Contains(meta.ParentFolderID, "draft")
	docPath := ds.adapter.getDocumentPath(id, isDraft)

	// Delete document file
	if err := os.Remove(docPath); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to delete document file: %w", err)
	}

	// Delete metadata
	if err := ds.adapter.metadataStore.Delete(id); err != nil {
		return fmt.Errorf("failed to delete metadata: %w", err)
	}

	return nil
}

// ListDocuments lists documents in a folder.
func (ds *documentStorage) ListDocuments(ctx context.Context, folderID string, opts *storage.ListOptions) ([]*storage.Document, error) {
	allMeta, err := ds.adapter.metadataStore.List()
	if err != nil {
		return nil, fmt.Errorf("failed to list metadata: %w", err)
	}

	var docs []*storage.Document
	for _, meta := range allMeta {
		// Filter by folder
		if meta.ParentFolderID != folderID {
			continue
		}

		// Filter by trashed
		if !opts.IncludeTrashed && meta.Trashed {
			continue
		}

		// Filter by modified time
		if opts.ModifiedAfter != nil && meta.ModifiedTime.Before(*opts.ModifiedAfter) {
			continue
		}

		doc := &storage.Document{
			ID:             meta.ID,
			Name:           meta.Name,
			MimeType:       "text/markdown",
			ParentFolderID: meta.ParentFolderID,
			CreatedTime:    meta.CreatedTime,
			ModifiedTime:   meta.ModifiedTime,
			Owner:          meta.Owner,
			ThumbnailURL:   meta.ThumbnailURL,
			Metadata:       meta.Metadata,
			Trashed:        meta.Trashed,
		}

		docs = append(docs, doc)

		// Apply page size limit
		if opts.PageSize > 0 && len(docs) >= opts.PageSize {
			break
		}
	}

	return docs, nil
}

// GetDocumentContent retrieves the full content of a document.
func (ds *documentStorage) GetDocumentContent(ctx context.Context, id string) (string, error) {
	doc, err := ds.GetDocument(ctx, id)
	if err != nil {
		return "", err
	}
	return doc.Content, nil
}

// UpdateDocumentContent updates the content of a document.
func (ds *documentStorage) UpdateDocumentContent(ctx context.Context, id string, content string) error {
	_, err := ds.UpdateDocument(ctx, id, &storage.DocumentUpdate{
		Content: &content,
	})
	return err
}

// ReplaceTextInDocument performs text replacements in a document.
func (ds *documentStorage) ReplaceTextInDocument(ctx context.Context, id string, replacements map[string]string) error {
	content, err := ds.GetDocumentContent(ctx, id)
	if err != nil {
		return err
	}

	// Perform replacements (template format: {{key}})
	for key, value := range replacements {
		placeholder := fmt.Sprintf("{{%s}}", key)
		content = strings.ReplaceAll(content, placeholder, value)
	}

	return ds.UpdateDocumentContent(ctx, id, content)
}

// CopyDocument copies a document to a destination folder.
func (ds *documentStorage) CopyDocument(ctx context.Context, sourceID, destFolderID, name string) (*storage.Document, error) {
	source, err := ds.GetDocument(ctx, sourceID)
	if err != nil {
		return nil, err
	}

	return ds.CreateDocument(ctx, &storage.DocumentCreate{
		Name:           name,
		ParentFolderID: destFolderID,
		Content:        source.Content,
		Owner:          source.Owner,
		Metadata:       source.Metadata,
	})
}

// MoveDocument moves a document to a destination folder.
func (ds *documentStorage) MoveDocument(ctx context.Context, docID, destFolderID string) error {
	_, err := ds.UpdateDocument(ctx, docID, &storage.DocumentUpdate{
		ParentFolderID: &destFolderID,
	})
	return err
}

// CreateFolder creates a new folder.
func (ds *documentStorage) CreateFolder(ctx context.Context, name, parentID string) (*storage.Folder, error) {
	if name == "" {
		return nil, storage.InvalidInputError("name", "cannot be empty")
	}

	id := generateID()
	now := time.Now()

	folder := &storage.Folder{
		ID:           id,
		Name:         name,
		ParentID:     parentID,
		CreatedTime:  now,
		ModifiedTime: now,
		Metadata:     make(map[string]any),
	}

	// Save folder metadata
	folderPath := ds.adapter.getFolderPath(id)
	data, err := json.Marshal(folder)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal folder: %w", err)
	}

	if err := os.WriteFile(folderPath, data, 0644); err != nil {
		return nil, fmt.Errorf("failed to write folder metadata: %w", err)
	}

	return folder, nil
}

// GetFolder retrieves folder information.
func (ds *documentStorage) GetFolder(ctx context.Context, id string) (*storage.Folder, error) {
	folderPath := ds.adapter.getFolderPath(id)
	data, err := os.ReadFile(folderPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, storage.NotFoundError("folder", id)
		}
		return nil, fmt.Errorf("failed to read folder: %w", err)
	}

	var folder storage.Folder
	if err := json.Unmarshal(data, &folder); err != nil {
		return nil, fmt.Errorf("failed to unmarshal folder: %w", err)
	}

	return &folder, nil
}

// ListFolders lists subfolders in a parent folder.
func (ds *documentStorage) ListFolders(ctx context.Context, parentID string) ([]*storage.Folder, error) {
	files, err := os.ReadDir(ds.adapter.foldersPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read folders directory: %w", err)
	}

	var folders []*storage.Folder
	for _, file := range files {
		if file.IsDir() || !strings.HasSuffix(file.Name(), ".json") {
			continue
		}

		id := strings.TrimSuffix(file.Name(), ".json")
		folder, err := ds.GetFolder(ctx, id)
		if err != nil {
			continue
		}

		if folder.ParentID == parentID {
			folders = append(folders, folder)
		}
	}

	return folders, nil
}

// GetSubfolder gets a subfolder by name within a parent folder.
func (ds *documentStorage) GetSubfolder(ctx context.Context, parentID, name string) (*storage.Folder, error) {
	folders, err := ds.ListFolders(ctx, parentID)
	if err != nil {
		return nil, err
	}

	for _, folder := range folders {
		if folder.Name == name {
			return folder, nil
		}
	}

	return nil, nil // Not found, but not an error
}

// ListRevisions lists document revisions/versions.
func (ds *documentStorage) ListRevisions(ctx context.Context, docID string) ([]*storage.Revision, error) {
	// Filesystem adapter doesn't support revisions by default
	// This would require additional implementation (e.g., git backend)
	return nil, storage.ErrNotImplemented
}

// GetRevision retrieves a specific revision.
func (ds *documentStorage) GetRevision(ctx context.Context, docID, revisionID string) (*storage.Revision, error) {
	return nil, storage.ErrNotImplemented
}

// GetLatestRevision retrieves the latest revision.
func (ds *documentStorage) GetLatestRevision(ctx context.Context, docID string) (*storage.Revision, error) {
	// Return pseudo-revision with current document state
	doc, err := ds.GetDocument(ctx, docID)
	if err != nil {
		return nil, err
	}

	return &storage.Revision{
		ID:           "latest",
		DocumentID:   docID,
		ModifiedTime: doc.ModifiedTime,
		ModifiedBy:   doc.Owner,
		Content:      doc.Content,
	}, nil
}
