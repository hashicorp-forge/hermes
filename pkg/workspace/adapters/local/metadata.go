package localworkspace

import (
"bufio"
"bytes"
"fmt"
"os"
"path/filepath"
"strconv"
"strings"
"sync"
"time"
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
	mu       sync.RWMutex
}

// NewMetadataStore creates a new metadata store.
func NewMetadataStore(basePath string) (*MetadataStore, error) {
	return &MetadataStore{
		basePath: basePath,
	}, nil
}

// Get retrieves metadata from a document file's frontmatter.
func (ms *MetadataStore) Get(docPath string) (*DocumentMetadata, error) {
ms.mu.RLock()
defer ms.mu.RUnlock()

data, err := os.ReadFile(docPath)
if err != nil {
if os.IsNotExist(err) {
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

// Set updates metadata in a document file's frontmatter.
func (ms *MetadataStore) Set(docPath string, meta *DocumentMetadata, content string) error {
	ms.mu.Lock()
	defer ms.mu.Unlock()

	data := serializeFrontmatter(meta, content)

	if err := os.WriteFile(docPath, data, 0644); err != nil {
		return fmt.Errorf("failed to write document: %w", err)
	}

	return nil
}

// Delete removes a document file.
func (ms *MetadataStore) Delete(docPath string) error {
	ms.mu.Lock()
	defer ms.mu.Unlock()

	if err := os.Remove(docPath); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("failed to delete document: %w", err)
	}

	return nil
}

// List returns all document metadata from a directory.
func (ms *MetadataStore) List(dirPath string) ([]*DocumentMetadata, error) {
	ms.mu.RLock()
	defer ms.mu.RUnlock()

	files, err := os.ReadDir(dirPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read directory: %w", err)
	}

	var results []*DocumentMetadata
	for _, file := range files {
		if file.IsDir() || filepath.Ext(file.Name()) != ".md" {
			continue
		}

		docPath := filepath.Join(dirPath, file.Name())
		data, err := os.ReadFile(docPath)
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
			if t, err := time.Parse(time.RFC3339, value); err == nil {
				meta.CreatedTime = t
			}
		case "modified_time":
			if t, err := time.Parse(time.RFC3339, value); err == nil {
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
	buf.WriteString(fmt.Sprintf("created_time: %s\n", meta.CreatedTime.Format(time.RFC3339)))
	buf.WriteString(fmt.Sprintf("modified_time: %s\n", meta.ModifiedTime.Format(time.RFC3339)))
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
