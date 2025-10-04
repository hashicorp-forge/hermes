package local

import (
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/spf13/afero"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParseFrontmatter(t *testing.T) {
	tests := []struct {
		name        string
		input       []byte
		wantID      string
		wantName    string
		wantContent string
		wantErr     bool
	}{
		{
			name: "valid frontmatter",
			input: []byte(`---
id: doc-123
name: Test Document
parent_folder_id: folder-1
created_time: 2024-01-01T00:00:00Z
modified_time: 2024-01-01T00:00:00Z
owner: user@example.com
trashed: false
---
# Test Content

This is the document content.`),
			wantID:      "doc-123",
			wantName:    "Test Document",
			wantContent: "# Test Content\n\nThis is the document content.",
			wantErr:     false,
		},
		{
			name: "frontmatter with metadata",
			input: []byte(`---
id: doc-456
name: RFC Document
parent_folder_id: rfcs
created_time: 2024-01-01T00:00:00Z
modified_time: 2024-01-01T00:00:00Z
owner: owner@example.com
trashed: false
metadata:
  type: RFC
  status: Draft
---
Content here`),
			wantID:      "doc-456",
			wantName:    "RFC Document",
			wantContent: "Content here",
			wantErr:     false,
		},
		{
			name:        "no frontmatter",
			input:       []byte("# Just Content\n\nNo frontmatter here."),
			wantContent: "",
			wantErr:     true, // parseFrontmatter requires frontmatter
		},
		{
			name: "empty content after frontmatter",
			input: []byte(`---
id: doc-789
name: Empty Doc
parent_folder_id: folder-1
created_time: 2024-01-01T00:00:00Z
modified_time: 2024-01-01T00:00:00Z
owner: user@example.com
trashed: false
---`),
			wantID:      "doc-789",
			wantName:    "Empty Doc",
			wantContent: "",
			wantErr:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			meta, content, err := parseFrontmatter(tt.input)

			if tt.wantErr {
				require.Error(t, err)
				return
			}

			require.NoError(t, err)
			if tt.wantID != "" {
				assert.Equal(t, tt.wantID, meta.ID)
			}
			if tt.wantName != "" {
				assert.Equal(t, tt.wantName, meta.Name)
			}
			assert.Equal(t, tt.wantContent, content)
		})
	}
}

func TestSerializeFrontmatter(t *testing.T) {
	now := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)

	meta := &DocumentMetadata{
		ID:             "doc-123",
		Name:           "Test Doc",
		ParentFolderID: "folder-1",
		CreatedTime:    now,
		ModifiedTime:   now,
		Owner:          "user@example.com",
		Trashed:        false,
		Metadata: map[string]any{
			"type":   "RFC",
			"status": "Draft",
		},
	}

	content := "# Test Content\n\nThis is the document."
	result := serializeFrontmatter(meta, content)

	// Verify it can be parsed back
	parsedMeta, parsedContent, err := parseFrontmatter(result)
	require.NoError(t, err)

	assert.Equal(t, meta.ID, parsedMeta.ID)
	assert.Equal(t, meta.Name, parsedMeta.Name)
	assert.Equal(t, meta.ParentFolderID, parsedMeta.ParentFolderID)
	assert.Equal(t, meta.Owner, parsedMeta.Owner)
	assert.Equal(t, content, parsedContent)
}

func TestMetadataStoreGet(t *testing.T) {
	fs := afero.NewMemMapFs()
	store, err := NewMetadataStore("/test", fs)
	require.NoError(t, err)

	// Create a test document
	now := time.Now()
	meta := &DocumentMetadata{
		ID:             "doc-123",
		Name:           "Test Doc",
		ParentFolderID: "folder-1",
		CreatedTime:    now,
		ModifiedTime:   now,
		Owner:          "user@example.com",
		Trashed:        false,
	}
	content := "Test content"

	docPath := "/test/docs/doc-123.md"
	err = store.Set(docPath, meta, content)
	require.NoError(t, err)

	// Retrieve it
	retrieved, err := store.Get(docPath)
	require.NoError(t, err)

	assert.Equal(t, meta.ID, retrieved.ID)
	assert.Equal(t, meta.Name, retrieved.Name)
	assert.Equal(t, meta.ParentFolderID, retrieved.ParentFolderID)
}

func TestMetadataStoreGetNotFound(t *testing.T) {
	fs := afero.NewMemMapFs()
	store, err := NewMetadataStore("/test", fs)
	require.NoError(t, err)

	_, err = store.Get("/test/nonexistent.md")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "document not found")
}

func TestMetadataStoreGetWithContent(t *testing.T) {
	fs := afero.NewMemMapFs()
	store, err := NewMetadataStore("/test", fs)
	require.NoError(t, err)

	// Create a test document
	now := time.Now()
	meta := &DocumentMetadata{
		ID:             "doc-456",
		Name:           "Content Test",
		ParentFolderID: "folder-1",
		CreatedTime:    now,
		ModifiedTime:   now,
		Owner:          "user@example.com",
		Trashed:        false,
	}
	expectedContent := "# Test\n\nThis is the content."

	docPath := "/test/docs/doc-456.md"
	err = store.Set(docPath, meta, expectedContent)
	require.NoError(t, err)

	// Retrieve with content
	retrievedMeta, retrievedContent, err := store.GetWithContent(docPath)
	require.NoError(t, err)

	assert.Equal(t, meta.ID, retrievedMeta.ID)
	assert.Equal(t, meta.Name, retrievedMeta.Name)
	assert.Equal(t, expectedContent, retrievedContent)
}

func TestMetadataStoreSet(t *testing.T) {
	fs := afero.NewMemMapFs()
	store, err := NewMetadataStore("/test", fs)
	require.NoError(t, err)

	now := time.Now()
	meta := &DocumentMetadata{
		ID:             "doc-789",
		Name:           "Set Test",
		ParentFolderID: "folder-1",
		CreatedTime:    now,
		ModifiedTime:   now,
		Owner:          "user@example.com",
		Trashed:        false,
		Metadata: map[string]any{
			"custom": "value",
		},
	}
	content := "Document content"

	docPath := "/test/docs/doc-789.md"

	// Need to create parent directory
	err = fs.MkdirAll(filepath.Dir(docPath), 0755)
	require.NoError(t, err)

	err = store.Set(docPath, meta, content)
	require.NoError(t, err)

	// Verify file exists
	exists, err := afero.Exists(fs, docPath)
	require.NoError(t, err)
	assert.True(t, exists)

	// Verify content
	data, err := afero.ReadFile(fs, docPath)
	require.NoError(t, err)
	assert.Contains(t, string(data), "---") // Has frontmatter
	assert.Contains(t, string(data), content)
}

func TestMetadataStoreDelete(t *testing.T) {
	fs := afero.NewMemMapFs()
	store, err := NewMetadataStore("/test", fs)
	require.NoError(t, err)

	// Create a document
	docPath := "/test/docs/doc-delete.md"
	err = fs.MkdirAll(filepath.Dir(docPath), 0755)
	require.NoError(t, err)

	meta := &DocumentMetadata{
		ID:             "doc-delete",
		Name:           "Delete Test",
		ParentFolderID: "folder-1",
		CreatedTime:    time.Now(),
		ModifiedTime:   time.Now(),
		Owner:          "user@example.com",
	}
	err = store.Set(docPath, meta, "content")
	require.NoError(t, err)

	// Delete it
	err = store.Delete(docPath)
	require.NoError(t, err)

	// Verify it's gone
	exists, err := afero.Exists(fs, docPath)
	require.NoError(t, err)
	assert.False(t, exists)
}

func TestMetadataStoreDeleteNonexistent(t *testing.T) {
	fs := afero.NewMemMapFs()
	store, err := NewMetadataStore("/test", fs)
	require.NoError(t, err)

	// Deleting non-existent file should not error
	err = store.Delete("/test/nonexistent.md")
	require.NoError(t, err)
}

func TestMetadataStoreList(t *testing.T) {
	fs := afero.NewMemMapFs()
	store, err := NewMetadataStore("/test", fs)
	require.NoError(t, err)

	// Create directory
	dirPath := "/test/docs"
	err = fs.MkdirAll(dirPath, 0755)
	require.NoError(t, err)

	// Create multiple documents
	now := time.Now()
	for i := 1; i <= 3; i++ {
		meta := &DocumentMetadata{
			ID:             "doc-" + string(rune('0'+i)),
			Name:           "Doc " + string(rune('0'+i)),
			ParentFolderID: "folder-1",
			CreatedTime:    now,
			ModifiedTime:   now,
			Owner:          "user@example.com",
		}
		docPath := filepath.Join(dirPath, meta.ID+".md")
		err = store.Set(docPath, meta, "content")
		require.NoError(t, err)
	}

	// List documents
	results, err := store.List(dirPath)
	require.NoError(t, err)

	assert.Len(t, results, 3)
}

func TestMetadataStoreListEmptyDirectory(t *testing.T) {
	fs := afero.NewMemMapFs()
	store, err := NewMetadataStore("/test", fs)
	require.NoError(t, err)

	// Create empty directory
	dirPath := "/test/empty"
	err = fs.MkdirAll(dirPath, 0755)
	require.NoError(t, err)

	// List should return empty slice
	results, err := store.List(dirPath)
	require.NoError(t, err)
	assert.Empty(t, results)
}

func TestMetadataStoreConcurrent(t *testing.T) {
	fs := afero.NewMemMapFs()
	store, err := NewMetadataStore("/test", fs)
	require.NoError(t, err)

	// Create directory
	dirPath := "/test/concurrent"
	err = fs.MkdirAll(dirPath, 0755)
	require.NoError(t, err)

	// Concurrent writes
	var wg sync.WaitGroup
	numGoroutines := 10

	for i := 0; i < numGoroutines; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()

			meta := &DocumentMetadata{
				ID:             "doc-" + string(rune('a'+id)),
				Name:           "Concurrent Doc",
				ParentFolderID: "folder-1",
				CreatedTime:    time.Now(),
				ModifiedTime:   time.Now(),
				Owner:          "user@example.com",
			}
			docPath := filepath.Join(dirPath, meta.ID+".md")
			err := store.Set(docPath, meta, "content")
			require.NoError(t, err)
		}(i)
	}

	wg.Wait()

	// Verify all documents were created
	results, err := store.List(dirPath)
	require.NoError(t, err)
	assert.Len(t, results, numGoroutines)
}

func TestMetadataStorePreservesContentDuringUpdate(t *testing.T) {
	fs := afero.NewMemMapFs()
	store, err := NewMetadataStore("/test", fs)
	require.NoError(t, err)

	docPath := "/test/docs/doc-update.md"
	err = fs.MkdirAll(filepath.Dir(docPath), 0755)
	require.NoError(t, err)

	// Create initial document
	originalContent := "# Original Content\n\nThis should be preserved."
	meta := &DocumentMetadata{
		ID:             "doc-update",
		Name:           "Original Name",
		ParentFolderID: "folder-1",
		CreatedTime:    time.Now(),
		ModifiedTime:   time.Now(),
		Owner:          "user@example.com",
	}
	err = store.Set(docPath, meta, originalContent)
	require.NoError(t, err)

	// Update metadata only (change name)
	meta.Name = "Updated Name"
	meta.ModifiedTime = time.Now()
	err = store.Set(docPath, meta, originalContent)
	require.NoError(t, err)

	// Retrieve and verify content is preserved
	retrievedMeta, retrievedContent, err := store.GetWithContent(docPath)
	require.NoError(t, err)

	assert.Equal(t, "Updated Name", retrievedMeta.Name)
	assert.Equal(t, originalContent, retrievedContent)
}

func TestParseFrontmatterMalformed(t *testing.T) {
	tests := []struct {
		name    string
		input   []byte
		wantErr bool
	}{
		{
			name: "unclosed frontmatter - missing closing delimiter",
			input: []byte(`---
id: doc-123
name: Test
content without closing`),
			wantErr: false, // Current implementation doesn't validate closing
		},
		{
			name: "malformed key-value - handled gracefully",
			input: []byte(`---
id: doc-123
name: Test
invalid line without colon
---
content`),
			wantErr: false, // Lines without : are skipped
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, _, err := parseFrontmatter(tt.input)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestMetadataStoreListIgnoresNonMarkdownFiles(t *testing.T) {
	fs := afero.NewMemMapFs()
	store, err := NewMetadataStore("/test", fs)
	require.NoError(t, err)

	dirPath := "/test/docs"
	err = fs.MkdirAll(dirPath, 0755)
	require.NoError(t, err)

	// Create markdown file
	meta := &DocumentMetadata{
		ID:             "doc-1",
		Name:           "Doc 1",
		ParentFolderID: "folder-1",
		CreatedTime:    time.Now(),
		ModifiedTime:   time.Now(),
		Owner:          "user@example.com",
	}
	err = store.Set(filepath.Join(dirPath, "doc-1.md"), meta, "content")
	require.NoError(t, err)

	// Create non-markdown files
	err = afero.WriteFile(fs, filepath.Join(dirPath, "readme.txt"), []byte("text"), 0644)
	require.NoError(t, err)
	err = afero.WriteFile(fs, filepath.Join(dirPath, "data.json"), []byte("{}"), 0644)
	require.NoError(t, err)

	// List should only return markdown files
	results, err := store.List(dirPath)
	require.NoError(t, err)
	assert.Len(t, results, 1)
	assert.Equal(t, "doc-1", results[0].ID)
}

func TestMetadataStoreListIgnoresSubdirectories(t *testing.T) {
	fs := afero.NewMemMapFs()
	store, err := NewMetadataStore("/test", fs)
	require.NoError(t, err)

	dirPath := "/test/docs"
	err = fs.MkdirAll(dirPath, 0755)
	require.NoError(t, err)

	// Create markdown file
	meta := &DocumentMetadata{
		ID:             "doc-1",
		Name:           "Doc 1",
		ParentFolderID: "folder-1",
		CreatedTime:    time.Now(),
		ModifiedTime:   time.Now(),
		Owner:          "user@example.com",
	}
	err = store.Set(filepath.Join(dirPath, "doc-1.md"), meta, "content")
	require.NoError(t, err)

	// Create subdirectory
	err = fs.MkdirAll(filepath.Join(dirPath, "subdir"), 0755)
	require.NoError(t, err)

	// List should only return files, not directories
	results, err := store.List(dirPath)
	require.NoError(t, err)
	assert.Len(t, results, 1)
}

func BenchmarkMetadataStoreSet(b *testing.B) {
	fs := afero.NewMemMapFs()
	store, _ := NewMetadataStore("/test", fs)
	_ = fs.MkdirAll("/test/docs", 0755)

	meta := &DocumentMetadata{
		ID:             "doc-bench",
		Name:           "Benchmark Doc",
		ParentFolderID: "folder-1",
		CreatedTime:    time.Now(),
		ModifiedTime:   time.Now(),
		Owner:          "user@example.com",
	}
	content := strings.Repeat("This is test content. ", 100)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = store.Set("/test/docs/doc-bench.md", meta, content)
	}
}

func BenchmarkMetadataStoreGet(b *testing.B) {
	fs := afero.NewMemMapFs()
	store, _ := NewMetadataStore("/test", fs)
	_ = fs.MkdirAll("/test/docs", 0755)

	meta := &DocumentMetadata{
		ID:             "doc-bench",
		Name:           "Benchmark Doc",
		ParentFolderID: "folder-1",
		CreatedTime:    time.Now(),
		ModifiedTime:   time.Now(),
		Owner:          "user@example.com",
	}
	content := strings.Repeat("This is test content. ", 100)
	_ = store.Set("/test/docs/doc-bench.md", meta, content)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = store.Get("/test/docs/doc-bench.md")
	}
}
