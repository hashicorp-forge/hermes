package local

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/spf13/afero"
)

// DocumentMetadata stores metadata about a document.
type DocumentMetadata struct {
	ID             string         `yaml:"id"`
	Name           string         `yaml:"name"`
	ParentFolderID string         `yaml:"parent_folder_id"`
	CreatedTime    time.Time      `yaml:"created_time"`
	ModifiedTime   time.Time      `yaml:"modified_time"`
	Owner          string         `yaml:"owner"`
	ThumbnailURL   string         `yaml:"thumbnail_url,omitempty"`
	Metadata       map[string]any `yaml:"metadata,omitempty"`
	Trashed        bool           `yaml:"trashed"`
}

// MetadataStore manages document metadata storage.
// Metadata is stored as YAML frontmatter in the document files themselves.
type MetadataStore struct {
	basePath string
	fs       FileSystem
	mu       sync.RWMutex
}

// NewMetadataStore creates a new metadata store.
func NewMetadataStore(basePath string, fs FileSystem) (*MetadataStore, error) {
	return &MetadataStore{
		basePath: basePath,
		fs:       fs,
	}, nil
}

// Get retrieves metadata from a document file's frontmatter or metadata.json.
// Supports both single-file format (.md with frontmatter) and directory format (folder with metadata.json).
func (ms *MetadataStore) Get(docPath string) (*DocumentMetadata, error) {
	ms.mu.RLock()
	defer ms.mu.RUnlock()

	// Check if this is a directory-based document
	metadataPath := filepath.Join(docPath, "metadata.json")
	if stat, err := ms.fs.Stat(metadataPath); err == nil && !stat.IsDir() {
		// Directory-based format: read metadata.json
		return ms.getFromMetadataJSON(metadataPath)
	}

	// Single-file format: read .md file with frontmatter
	data, err := afero.ReadFile(ms.fs, docPath)
	if err != nil {
		if _, statErr := ms.fs.Stat(docPath); statErr != nil {
			return nil, fmt.Errorf("document not found: %q", docPath)
		}
		return nil, fmt.Errorf("failed to read document: %w", err)
	}

	meta, _, err := parseFrontmatter(data)
	if err != nil {
		return nil, fmt.Errorf("failed to parse frontmatter: %w", err)
	}

	return meta, nil
}

// GetWithContent retrieves both metadata and content from a document file.
// Supports both single-file format (.md with frontmatter) and directory format (folder with metadata.json + content.md).
func (ms *MetadataStore) GetWithContent(docPath string) (*DocumentMetadata, string, error) {
	ms.mu.RLock()
	defer ms.mu.RUnlock()

	// Check if this is a directory-based document
	metadataPath := filepath.Join(docPath, "metadata.json")
	if stat, err := ms.fs.Stat(metadataPath); err == nil && !stat.IsDir() {
		// Directory-based format: read metadata.json and content.md
		meta, err := ms.getFromMetadataJSON(metadataPath)
		if err != nil {
			return nil, "", fmt.Errorf("failed to read metadata.json: %w", err)
		}

		contentPath := filepath.Join(docPath, "content.md")
		contentData, err := afero.ReadFile(ms.fs, contentPath)
		if err != nil {
			return nil, "", fmt.Errorf("failed to read content.md: %w", err)
		}

		return meta, string(contentData), nil
	}

	// Single-file format: read .md file with frontmatter
	data, err := afero.ReadFile(ms.fs, docPath)
	if err != nil {
		if _, statErr := ms.fs.Stat(docPath); statErr != nil {
			return nil, "", fmt.Errorf("document not found: %q", docPath)
		}
		return nil, "", fmt.Errorf("failed to read document: %w", err)
	}

	meta, content, err := parseFrontmatter(data)
	if err != nil {
		return nil, "", fmt.Errorf("failed to parse frontmatter: %w", err)
	}

	return meta, content, nil
}

// getFromMetadataJSON reads metadata from a metadata.json file.
func (ms *MetadataStore) getFromMetadataJSON(metadataPath string) (*DocumentMetadata, error) {
	data, err := afero.ReadFile(ms.fs, metadataPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read metadata.json: %w", err)
	}

	var jsonMeta map[string]interface{}
	if err := json.Unmarshal(data, &jsonMeta); err != nil {
		return nil, fmt.Errorf("failed to parse metadata.json: %w", err)
	}

	meta := &DocumentMetadata{
		Metadata: make(map[string]any),
	}

	// Parse standard fields
	if id, ok := jsonMeta["id"].(string); ok {
		meta.ID = id
	}
	if googleFileID, ok := jsonMeta["googleFileID"].(string); ok && meta.ID == "" {
		meta.ID = googleFileID // Use googleFileID as fallback for ID
	}
	if title, ok := jsonMeta["title"].(string); ok {
		meta.Name = title
	} else if name, ok := jsonMeta["name"].(string); ok {
		meta.Name = name
	}
	if parentID, ok := jsonMeta["parent_folder_id"].(string); ok {
		meta.ParentFolderID = parentID
	}
	if owner, ok := jsonMeta["owner"].(string); ok {
		meta.Owner = owner
	} else if owners, ok := jsonMeta["owners"].([]interface{}); ok && len(owners) > 0 {
		if ownerStr, ok := owners[0].(string); ok {
			meta.Owner = ownerStr
		}
	}
	if thumbnail, ok := jsonMeta["thumbnail_url"].(string); ok {
		meta.ThumbnailURL = thumbnail
	}
	if trashed, ok := jsonMeta["trashed"].(bool); ok {
		meta.Trashed = trashed
	}

	// Parse timestamps
	if createdStr, ok := jsonMeta["createdTime"].(string); ok {
		if t, err := time.Parse(time.RFC3339, createdStr); err == nil {
			meta.CreatedTime = t
		} else if t, err := time.Parse(time.RFC3339Nano, createdStr); err == nil {
			meta.CreatedTime = t
		}
	}
	if modifiedStr, ok := jsonMeta["modifiedTime"].(string); ok {
		if t, err := time.Parse(time.RFC3339, modifiedStr); err == nil {
			meta.ModifiedTime = t
		} else if t, err := time.Parse(time.RFC3339Nano, modifiedStr); err == nil {
			meta.ModifiedTime = t
		}
	}

	// Store all other fields in Metadata map
	for key, value := range jsonMeta {
		switch key {
		case "id", "googleFileID", "title", "name", "parent_folder_id", "owner", "owners",
			"thumbnail_url", "trashed", "createdTime", "modifiedTime":
			// Skip standard fields already parsed
			continue
		default:
			meta.Metadata[key] = value
		}
	}

	return meta, nil
}

// Set updates metadata in a document file's frontmatter or directory structure.
// Preserves the existing format (single-file or directory-based).
func (ms *MetadataStore) Set(docPath string, meta *DocumentMetadata, content string) error {
	ms.mu.Lock()
	defer ms.mu.Unlock()

	// Check if this is a directory-based document
	metadataPath := filepath.Join(docPath, "metadata.json")
	if stat, err := ms.fs.Stat(metadataPath); err == nil && !stat.IsDir() {
		// Directory-based format: update metadata.json and content.md
		return ms.setInDirectory(docPath, meta, content)
	}

	// Single-file format: write .md file with frontmatter
	data := serializeFrontmatter(meta, content)
	if err := afero.WriteFile(ms.fs, docPath, data, 0644); err != nil {
		return fmt.Errorf("failed to write document: %w", err)
	}

	return nil
}

// setInDirectory writes metadata and content to a directory-based document structure.
func (ms *MetadataStore) setInDirectory(docPath string, meta *DocumentMetadata, content string) error {
	// Write metadata.json
	metadataPath := filepath.Join(docPath, "metadata.json")
	metadataJSON := map[string]interface{}{
		"id":               meta.ID,
		"googleFileID":     meta.ID,
		"title":            meta.Name,
		"name":             meta.Name,
		"parent_folder_id": meta.ParentFolderID,
		"owner":            meta.Owner,
		"createdTime":      meta.CreatedTime.Format(time.RFC3339),
		"modifiedTime":     meta.ModifiedTime.Format(time.RFC3339),
		"trashed":          meta.Trashed,
	}
	if meta.ThumbnailURL != "" {
		metadataJSON["thumbnail_url"] = meta.ThumbnailURL
	}
	// Add custom metadata fields
	for key, value := range meta.Metadata {
		metadataJSON[key] = value
	}

	metadataData, err := json.MarshalIndent(metadataJSON, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal metadata: %w", err)
	}

	if err := afero.WriteFile(ms.fs, metadataPath, metadataData, 0644); err != nil {
		return fmt.Errorf("failed to write metadata.json: %w", err)
	}

	// Write content.md
	contentPath := filepath.Join(docPath, "content.md")
	if err := afero.WriteFile(ms.fs, contentPath, []byte(content), 0644); err != nil {
		return fmt.Errorf("failed to write content.md: %w", err)
	}

	return nil
}

// Delete removes a document file.
func (ms *MetadataStore) Delete(docPath string) error {
	ms.mu.Lock()
	defer ms.mu.Unlock()

	if err := ms.fs.Remove(docPath); err != nil {
		// Check if file exists before treating as error
		if _, statErr := ms.fs.Stat(docPath); statErr == nil {
			return fmt.Errorf("failed to delete document: %w", err)
		}
		// File doesn't exist, that's okay
	}

	return nil
}

// List returns all document metadata from a directory.
func (ms *MetadataStore) List(dirPath string) ([]*DocumentMetadata, error) {
	ms.mu.RLock()
	defer ms.mu.RUnlock()

	files, err := afero.ReadDir(ms.fs, dirPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read directory: %w", err)
	}

	var results []*DocumentMetadata
	for _, file := range files {
		if file.IsDir() || filepath.Ext(file.Name()) != ".md" {
			continue
		}

		docPath := filepath.Join(dirPath, file.Name())
		data, err := afero.ReadFile(ms.fs, docPath)
		if err != nil {
			continue
		}

		meta, _, err := parseFrontmatter(data)
		if err != nil {
			continue
		}

		results = append(results, meta)
	}

	return results, nil
}

// parseFrontmatter extracts metadata and content from a document with YAML frontmatter.
// Format: ---\n<yaml>\n---\n<content>
func parseFrontmatter(data []byte) (*DocumentMetadata, string, error) {
	scanner := bufio.NewScanner(bytes.NewReader(data))

	// Check for opening ---
	if !scanner.Scan() || scanner.Text() != "---" {
		return nil, "", fmt.Errorf("missing frontmatter opening '---'")
	}

	// Parse YAML frontmatter
	meta := &DocumentMetadata{
		Metadata: make(map[string]any),
	}

	for scanner.Scan() {
		line := scanner.Text()
		if line == "---" {
			// End of frontmatter
			break
		}

		// Parse YAML key-value pairs
		parts := strings.SplitN(line, ":", 2)
		if len(parts) != 2 {
			continue
		}

		key := strings.TrimSpace(parts[0])
		value := strings.TrimSpace(parts[1])

		// Remove quotes if present
		value = strings.Trim(value, `"'`)

		switch key {
		case "id":
			meta.ID = value
		case "name":
			meta.Name = value
		case "parent_folder_id":
			meta.ParentFolderID = value
		case "created_time":
			if t, err := time.Parse(time.RFC3339Nano, value); err == nil {
				meta.CreatedTime = t
			} else if t, err := time.Parse(time.RFC3339, value); err == nil {
				meta.CreatedTime = t
			}
		case "modified_time":
			if t, err := time.Parse(time.RFC3339Nano, value); err == nil {
				meta.ModifiedTime = t
			} else if t, err := time.Parse(time.RFC3339, value); err == nil {
				meta.ModifiedTime = t
			}
		case "owner":
			meta.Owner = value
		case "thumbnail_url":
			meta.ThumbnailURL = value
		case "trashed":
			if b, err := strconv.ParseBool(value); err == nil {
				meta.Trashed = b
			}
		default:
			// Store other metadata
			meta.Metadata[key] = value
		}
	}

	// Read remaining content
	var contentBuf bytes.Buffer
	for scanner.Scan() {
		contentBuf.WriteString(scanner.Text())
		contentBuf.WriteString("\n")
	}

	content := strings.TrimSpace(contentBuf.String())

	return meta, content, nil
}

// serializeFrontmatter creates a document with YAML frontmatter.
func serializeFrontmatter(meta *DocumentMetadata, content string) []byte {
	var buf bytes.Buffer

	buf.WriteString("---\n")
	buf.WriteString(fmt.Sprintf("id: %s\n", meta.ID))
	buf.WriteString(fmt.Sprintf("name: %s\n", meta.Name))
	buf.WriteString(fmt.Sprintf("parent_folder_id: %s\n", meta.ParentFolderID))
	buf.WriteString(fmt.Sprintf("created_time: %s\n", meta.CreatedTime.Format(time.RFC3339Nano)))
	buf.WriteString(fmt.Sprintf("modified_time: %s\n", meta.ModifiedTime.Format(time.RFC3339Nano)))
	buf.WriteString(fmt.Sprintf("owner: %s\n", meta.Owner))

	if meta.ThumbnailURL != "" {
		buf.WriteString(fmt.Sprintf("thumbnail_url: %s\n", meta.ThumbnailURL))
	}

	buf.WriteString(fmt.Sprintf("trashed: %v\n", meta.Trashed))

	// Write custom metadata
	for key, value := range meta.Metadata {
		buf.WriteString(fmt.Sprintf("%s: %v\n", key, value))
	}

	buf.WriteString("---\n\n")
	buf.WriteString(content)

	return buf.Bytes()
}
