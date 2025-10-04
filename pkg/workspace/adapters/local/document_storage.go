package local

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/hashicorp-forge/hermes/pkg/workspace"
	"github.com/spf13/afero"
)

// documentStorage implements workspace.DocumentStorage.
type documentStorage struct {
	adapter *Adapter
}

// GetDocument retrieves a document by ID.
func (ds *documentStorage) GetDocument(ctx context.Context, id string) (*workspace.Document, error) {
	// Try both docs and drafts paths since we don't know which it is yet
	paths := []string{
		ds.adapter.getDocumentPath(id, false), // docs
		ds.adapter.getDocumentPath(id, true),  // drafts
	}

	var meta *DocumentMetadata
	var content string
	var err error

	for _, path := range paths {
		// Load metadata and content from the file
		meta, content, err = ds.adapter.metadataStore.GetWithContent(path)
		if err == nil {
			break
		}
	}

	if meta == nil {
		return nil, workspace.NotFoundError("document", id)
	}

	return &workspace.Document{
		ID:             id,
		Name:           meta.Name,
		Content:        content,
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
func (ds *documentStorage) CreateDocument(ctx context.Context, doc *workspace.DocumentCreate) (*workspace.Document, error) {
	if doc.Name == "" {
		return nil, workspace.InvalidInputError("Name", "cannot be empty")
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
	if err := afero.WriteFile(ds.adapter.fs, docPath, []byte(content), 0644); err != nil {
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

	if err := ds.adapter.metadataStore.Set(docPath, meta, content); err != nil {
		// Clean up document file on metadata failure
		ds.adapter.fs.Remove(docPath)
		return nil, fmt.Errorf("failed to store metadata: %w", err)
	}

	return &workspace.Document{
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
func (ds *documentStorage) UpdateDocument(ctx context.Context, id string, updates *workspace.DocumentUpdate) (*workspace.Document, error) {
	// Find the document
	docPath, isDraft, err := ds.adapter.findDocumentPath(id)
	if err != nil {
		return nil, err
	}

	// Load metadata
	meta, err := ds.adapter.metadataStore.Get(docPath)
	if err != nil {
		return nil, workspace.NotFoundError("document", id)
	}

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
			if err := ds.adapter.fs.Rename(oldPath, newPath); err != nil {
				return nil, fmt.Errorf("failed to move document: %w", err)
			}
		}

		meta.ParentFolderID = *updates.ParentFolderID
		isDraft = newIsDraft
	}
	if updates.Content != nil {
		currentPath := ds.adapter.getDocumentPath(id, isDraft)
		if err := afero.WriteFile(ds.adapter.fs, currentPath, []byte(*updates.Content), 0644); err != nil {
			return nil, fmt.Errorf("failed to update document content: %w", err)
		}
		docPath = currentPath // Update docPath in case it moved
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

	// Read current content to preserve it when updating metadata
	finalPath := ds.adapter.getDocumentPath(id, isDraft)
	contentBytes, err := afero.ReadFile(ds.adapter.fs, finalPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read document content: %w", err)
	}
	docPath = finalPath

	if err := ds.adapter.metadataStore.Set(docPath, meta, string(contentBytes)); err != nil {
		return nil, fmt.Errorf("failed to update metadata: %w", err)
	}

	// Reload full document
	return ds.GetDocument(ctx, id)
}

// DeleteDocument deletes a document.
func (ds *documentStorage) DeleteDocument(ctx context.Context, id string) error {
	// Find the document
	docPath, _, err := ds.adapter.findDocumentPath(id)
	if err != nil {
		return err
	}

	// Delete document file (metadata is stored in the file itself)
	if err := ds.adapter.fs.Remove(docPath); err != nil {
		// Check if file exists before treating as error
		if _, statErr := ds.adapter.fs.Stat(docPath); statErr == nil {
			return fmt.Errorf("failed to delete document file: %w", err)
		}
		// File doesn't exist, that's okay
	}

	return nil
}

// ListDocuments lists documents in a folder.
func (ds *documentStorage) ListDocuments(ctx context.Context, folderID string, opts *workspace.ListOptions) ([]*workspace.Document, error) {
	allMeta, err := ds.adapter.metadataStore.List(ds.adapter.docsPath)
	if err != nil {
		return nil, fmt.Errorf("failed to list metadata: %w", err)
	}

	var docs []*workspace.Document
	for _, meta := range allMeta {
		// Filter by folder
		if meta.ParentFolderID != folderID {
			continue
		}

		// Filter by trashed
		if opts != nil && !opts.IncludeTrashed && meta.Trashed {
			continue
		}

		// Filter by modified time
		if opts != nil && opts.ModifiedAfter != nil && !meta.ModifiedTime.After(*opts.ModifiedAfter) {
			continue
		}

		doc := &workspace.Document{
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
	_, err := ds.UpdateDocument(ctx, id, &workspace.DocumentUpdate{
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
func (ds *documentStorage) CopyDocument(ctx context.Context, sourceID, destFolderID, name string) (*workspace.Document, error) {
	source, err := ds.GetDocument(ctx, sourceID)
	if err != nil {
		return nil, err
	}

	return ds.CreateDocument(ctx, &workspace.DocumentCreate{
		Name:           name,
		ParentFolderID: destFolderID,
		Content:        source.Content,
		Owner:          source.Owner,
		Metadata:       source.Metadata,
	})
}

// MoveDocument moves a document to a destination folder.
func (ds *documentStorage) MoveDocument(ctx context.Context, docID, destFolderID string) error {
	_, err := ds.UpdateDocument(ctx, docID, &workspace.DocumentUpdate{
		ParentFolderID: &destFolderID,
	})
	return err
}

// CreateFolder creates a new folder.
func (ds *documentStorage) CreateFolder(ctx context.Context, name, parentID string) (*workspace.Folder, error) {
	if name == "" {
		return nil, workspace.InvalidInputError("name", "cannot be empty")
	}

	id := generateID()
	now := time.Now()

	folder := &workspace.Folder{
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

	if err := afero.WriteFile(ds.adapter.fs, folderPath, data, 0644); err != nil {
		return nil, fmt.Errorf("failed to write folder metadata: %w", err)
	}

	return folder, nil
}

// GetFolder retrieves folder information.
func (ds *documentStorage) GetFolder(ctx context.Context, id string) (*workspace.Folder, error) {
	folderPath := ds.adapter.getFolderPath(id)
	data, err := afero.ReadFile(ds.adapter.fs, folderPath)
	if err != nil {
		if _, statErr := ds.adapter.fs.Stat(folderPath); statErr != nil {
			return nil, workspace.NotFoundError("folder", id)
		}
		return nil, fmt.Errorf("failed to read folder: %w", err)
	}

	var folder workspace.Folder
	if err := json.Unmarshal(data, &folder); err != nil {
		return nil, fmt.Errorf("failed to unmarshal folder: %w", err)
	}

	return &folder, nil
}

// ListFolders lists subfolders in a parent folder.
func (ds *documentStorage) ListFolders(ctx context.Context, parentID string) ([]*workspace.Folder, error) {
	files, err := afero.ReadDir(ds.adapter.fs, ds.adapter.foldersPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read folders directory: %w", err)
	}

	var folders []*workspace.Folder
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
func (ds *documentStorage) GetSubfolder(ctx context.Context, parentID, name string) (*workspace.Folder, error) {
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
func (ds *documentStorage) ListRevisions(ctx context.Context, docID string) ([]*workspace.Revision, error) {
	// Filesystem adapter doesn't support revisions by default
	// This would require additional implementation (e.g., git backend)
	return nil, workspace.ErrNotImplemented
}

// GetRevision retrieves a specific revision.
func (ds *documentStorage) GetRevision(ctx context.Context, docID, revisionID string) (*workspace.Revision, error) {
	return nil, workspace.ErrNotImplemented
}

// GetLatestRevision retrieves the latest revision.
func (ds *documentStorage) GetLatestRevision(ctx context.Context, docID string) (*workspace.Revision, error) {
	// Return pseudo-revision with current document state
	doc, err := ds.GetDocument(ctx, docID)
	if err != nil {
		return nil, err
	}

	return &workspace.Revision{
		ID:           "latest",
		DocumentID:   docID,
		ModifiedTime: doc.ModifiedTime,
		ModifiedBy:   doc.Owner,
		Content:      doc.Content,
	}, nil
}
