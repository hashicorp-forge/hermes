package local

import (
	"context"
	"fmt"
	"strings"
	"testing"

	"github.com/hashicorp-forge/hermes/pkg/workspace"
	"github.com/spf13/afero"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestDocumentStorage_BasicOperations tests basic CRUD operations.
func TestDocumentStorage_BasicOperations(t *testing.T) {
	ctx := context.Background()

	t.Run("CreateDocument", func(t *testing.T) {
		adapter, cleanup := createTestAdapter(t)
		defer cleanup()

		docStorage := adapter.DocumentStorage()
		doc, err := docStorage.CreateDocument(ctx, &workspace.DocumentCreate{
			Name:           "RFC-001: Storage Abstraction",
			ParentFolderID: "docs",
			Content: `# RFC-001: Storage Abstraction Layer

## Summary
This RFC proposes a storage abstraction layer for Hermes.

## Motivation
- Support multiple storage backends
- Improve testability
- Enable local development

## Design
...`,
			Owner: "engineer@hashicorp.com",
		})
		require.NoError(t, err, "Failed to create document")
		assert.NotEmpty(t, doc.ID, "Document should have an ID")
		assert.Equal(t, "RFC-001: Storage Abstraction", doc.Name)
		assert.Equal(t, "engineer@hashicorp.com", doc.Owner)
		assert.NotZero(t, doc.CreatedTime, "Document should have creation time")
		assert.NotZero(t, doc.ModifiedTime, "Document should have modification time")
	})

	t.Run("UpdateDocument", func(t *testing.T) {
		adapter, cleanup := createTestAdapter(t)
		defer cleanup()

		docStorage := adapter.DocumentStorage()
		doc, err := docStorage.CreateDocument(ctx, &workspace.DocumentCreate{
			Name:           "Update Test Doc",
			ParentFolderID: "drafts",
			Content:        "Original content",
			Owner:          "test@hashicorp.com",
		})
		require.NoError(t, err, "Failed to create document")

		// Update content
		newContent := "Updated content with new information"
		updated, err := docStorage.UpdateDocument(ctx, doc.ID, &workspace.DocumentUpdate{
			Content: &newContent,
		})
		require.NoError(t, err, "Failed to update document")
		assert.Equal(t, newContent, updated.Content)
		assert.True(t, updated.ModifiedTime.After(doc.ModifiedTime),
			"Modified time should be updated")

		// Verify persistence
		retrieved, err := docStorage.GetDocument(ctx, doc.ID)
		require.NoError(t, err, "Failed to retrieve updated document")
		assert.Equal(t, newContent, retrieved.Content)
	})

	t.Run("GetDocument", func(t *testing.T) {
		adapter, cleanup := createTestAdapter(t)
		defer cleanup()

		docStorage := adapter.DocumentStorage()
		created, err := docStorage.CreateDocument(ctx, &workspace.DocumentCreate{
			Name:           "Get Test Doc",
			ParentFolderID: "get-test",
			Content:        "Test content for retrieval",
			Owner:          "test@hashicorp.com",
		})
		require.NoError(t, err, "Failed to create document")

		// Retrieve document
		retrieved, err := docStorage.GetDocument(ctx, created.ID)
		require.NoError(t, err, "Failed to get document")
		assert.Equal(t, created.ID, retrieved.ID)
		assert.Equal(t, created.Name, retrieved.Name)
		assert.Equal(t, created.Content, retrieved.Content)
		assert.Equal(t, created.Owner, retrieved.Owner)
	})

	t.Run("ListDocuments", func(t *testing.T) {
		adapter, cleanup := createTestAdapter(t)
		defer cleanup()

		docStorage := adapter.DocumentStorage()
		folder := "list-test"
		for i := 0; i < 5; i++ {
			_, err := docStorage.CreateDocument(ctx, &workspace.DocumentCreate{
				Name:           fmt.Sprintf("Doc %d", i),
				ParentFolderID: folder,
				Content:        fmt.Sprintf("Content %d", i),
				Owner:          "test@hashicorp.com",
			})
			require.NoError(t, err, "Failed to create document %d", i)
		}

		// List documents
		docs, err := docStorage.ListDocuments(ctx, folder, &workspace.ListOptions{
			PageSize: 10,
		})
		require.NoError(t, err, "Failed to list documents")
		assert.Len(t, docs, 5, "Should list all 5 documents")

		// Verify document order and properties
		for _, doc := range docs {
			assert.NotEmpty(t, doc.ID)
			assert.NotEmpty(t, doc.Name)
			assert.Equal(t, "test@hashicorp.com", doc.Owner)
		}
	})

	t.Run("MoveDocument", func(t *testing.T) {
		adapter, cleanup := createTestAdapter(t)
		defer cleanup()

		docStorage := adapter.DocumentStorage()
		doc, err := docStorage.CreateDocument(ctx, &workspace.DocumentCreate{
			Name:           "Move Test Doc",
			ParentFolderID: "move-source",
			Content:        "Document to be moved",
			Owner:          "test@hashicorp.com",
		})
		require.NoError(t, err, "Failed to create document")
		assert.Equal(t, "move-source", doc.ParentFolderID)

		// Move to destination folder
		err = docStorage.MoveDocument(ctx, doc.ID, "move-dest")
		require.NoError(t, err, "Failed to move document")

		// Verify new location
		moved, err := docStorage.GetDocument(ctx, doc.ID)
		require.NoError(t, err, "Failed to get moved document")
		assert.Equal(t, "move-dest", moved.ParentFolderID)
		assert.Equal(t, doc.Name, moved.Name)
		assert.Contains(t, moved.Content, "Document to be moved")
	})

	t.Run("DeleteDocument", func(t *testing.T) {
		adapter, cleanup := createTestAdapter(t)
		defer cleanup()

		docStorage := adapter.DocumentStorage()
		doc, err := docStorage.CreateDocument(ctx, &workspace.DocumentCreate{
			Name:           "Delete Test Doc",
			ParentFolderID: "delete-test",
			Content:        "Document to be deleted",
			Owner:          "test@hashicorp.com",
		})
		require.NoError(t, err, "Failed to create document")

		// Delete document
		err = docStorage.DeleteDocument(ctx, doc.ID)
		require.NoError(t, err, "Failed to delete document")

		// Verify deletion
		_, err = docStorage.GetDocument(ctx, doc.ID)
		assert.Error(t, err, "Should error when getting deleted document")
	})

	t.Run("CopyDocument", func(t *testing.T) {
		adapter, cleanup := createTestAdapter(t)
		defer cleanup()

		docStorage := adapter.DocumentStorage()
		original, err := docStorage.CreateDocument(ctx, &workspace.DocumentCreate{
			Name:           "Original Doc",
			ParentFolderID: "copy-source",
			Content:        "Original content to copy",
			Owner:          "test@hashicorp.com",
		})
		require.NoError(t, err, "Failed to create original document")

		// Copy document
		copy, err := docStorage.CopyDocument(ctx, original.ID, "copy-dest", "Copied Doc")
		require.NoError(t, err, "Failed to copy document")

		// Verify copy
		assert.NotEqual(t, original.ID, copy.ID, "Copy should have different ID")
		assert.Equal(t, "Copied Doc", copy.Name)
		assert.Equal(t, "copy-dest", copy.ParentFolderID)
		assert.Equal(t, original.Content, copy.Content, "Content should be copied")
	})
}

// TestDocumentStorage_ConcurrentOperations tests concurrent document operations.
func TestDocumentStorage_ConcurrentOperations(t *testing.T) {
	ctx := context.Background()

	t.Run("ConcurrentCreates", func(t *testing.T) {
		adapter, cleanup := createTestAdapter(t)
		defer cleanup()

		docStorage := adapter.DocumentStorage()

		const numDocs = 10
		done := make(chan error, numDocs)

		for i := 0; i < numDocs; i++ {
			go func(idx int) {
				_, err := docStorage.CreateDocument(ctx, &workspace.DocumentCreate{
					Name:           fmt.Sprintf("Concurrent Doc %d", idx),
					ParentFolderID: "concurrent-test",
					Content:        fmt.Sprintf("Content %d", idx),
					Owner:          "test@hashicorp.com",
				})
				done <- err
			}(i)
		}

		// Wait for all operations
		for i := 0; i < numDocs; i++ {
			err := <-done
			assert.NoError(t, err, "Concurrent create failed")
		}

		// Verify all documents were created
		docs, err := docStorage.ListDocuments(ctx, "concurrent-test", &workspace.ListOptions{
			PageSize: 20,
		})
		require.NoError(t, err, "Failed to list documents")
		assert.Len(t, docs, numDocs, "Should have created all documents")
	})

	t.Run("ConcurrentUpdates", func(t *testing.T) {
		adapter, cleanup := createTestAdapter(t)
		defer cleanup()

		docStorage := adapter.DocumentStorage()
		doc, err := docStorage.CreateDocument(ctx, &workspace.DocumentCreate{
			Name:           "Update Race Test",
			ParentFolderID: "update-test",
			Content:        "Initial content",
			Owner:          "test@hashicorp.com",
		})
		require.NoError(t, err, "Failed to create document")

		// Perform concurrent updates
		const numUpdates = 5
		done := make(chan error, numUpdates)

		for i := 0; i < numUpdates; i++ {
			go func(idx int) {
				content := fmt.Sprintf("Updated content %d", idx)
				_, err := docStorage.UpdateDocument(ctx, doc.ID, &workspace.DocumentUpdate{
					Content: &content,
				})
				done <- err
			}(i)
		}

		// Wait for all operations
		successCount := 0
		for i := 0; i < numUpdates; i++ {
			err := <-done
			if err == nil {
				successCount++
			}
		}

		// At least one update should succeed
		assert.Greater(t, successCount, 0, "At least one update should succeed")

		// Verify document still exists and has one of the updated contents
		updated, err := docStorage.GetDocument(ctx, doc.ID)
		require.NoError(t, err, "Failed to get updated document")
		assert.True(t, strings.Contains(updated.Content, "Updated content"),
			"Document should have updated content")
	})
}

// TestDocumentStorage_EdgeCases tests edge cases and error handling.
func TestDocumentStorage_EdgeCases(t *testing.T) {
	ctx := context.Background()

	t.Run("GetNonexistentDocument", func(t *testing.T) {
		adapter, cleanup := createTestAdapter(t)
		defer cleanup()

		docStorage := adapter.DocumentStorage()
		_, err := docStorage.GetDocument(ctx, "nonexistent-id")
		assert.Error(t, err, "Should error when getting nonexistent document")
	})

	t.Run("UpdateNonexistentDocument", func(t *testing.T) {
		adapter, cleanup := createTestAdapter(t)
		defer cleanup()

		docStorage := adapter.DocumentStorage()
		content := "Updated content"
		_, err := docStorage.UpdateDocument(ctx, "nonexistent-id", &workspace.DocumentUpdate{
			Content: &content,
		})
		assert.Error(t, err, "Should error when updating nonexistent document")
	})

	t.Run("MoveNonexistentDocument", func(t *testing.T) {
		adapter, cleanup := createTestAdapter(t)
		defer cleanup()

		docStorage := adapter.DocumentStorage()
		err := docStorage.MoveDocument(ctx, "nonexistent-id", "dest-folder")
		assert.Error(t, err, "Should error when moving nonexistent document")
	})

	t.Run("CopyNonexistentDocument", func(t *testing.T) {
		adapter, cleanup := createTestAdapter(t)
		defer cleanup()

		docStorage := adapter.DocumentStorage()
		_, err := docStorage.CopyDocument(ctx, "nonexistent-id", "dest-folder", "Copy Name")
		assert.Error(t, err, "Should error when copying nonexistent document")
	})

	t.Run("EmptyDocumentName", func(t *testing.T) {
		adapter, cleanup := createTestAdapter(t)
		defer cleanup()

		docStorage := adapter.DocumentStorage()
		_, err := docStorage.CreateDocument(ctx, &workspace.DocumentCreate{
			Name:           "",
			ParentFolderID: "test-folder",
			Content:        "Content",
			Owner:          "test@hashicorp.com",
		})
		assert.Error(t, err, "Should error with empty document name")
	})

	t.Run("ListEmptyFolder", func(t *testing.T) {
		adapter, cleanup := createTestAdapter(t)
		defer cleanup()

		docStorage := adapter.DocumentStorage()
		docs, err := docStorage.ListDocuments(ctx, "empty-folder", &workspace.ListOptions{
			PageSize: 10,
		})
		require.NoError(t, err, "Should not error listing empty folder")
		assert.Empty(t, docs, "Should return empty list for empty folder")
	})
}

// TestDocumentStorage_FolderOperations tests folder-related operations.
func TestDocumentStorage_FolderOperations(t *testing.T) {
	ctx := context.Background()

	t.Run("CreateFolderHierarchy", func(t *testing.T) {
		adapter, cleanup := createTestAdapter(t)
		defer cleanup()

		docStorage := adapter.DocumentStorage()

		// Create root folder
		root, err := docStorage.CreateFolder(ctx, "Projects", "")
		require.NoError(t, err, "Failed to create root folder")
		assert.NotEmpty(t, root.ID)
		assert.Equal(t, "Projects", root.Name)

		// Create subfolder
		sub, err := docStorage.CreateFolder(ctx, "RFC Documents", root.ID)
		require.NoError(t, err, "Failed to create subfolder")
		assert.NotEmpty(t, sub.ID)
		assert.Equal(t, "RFC Documents", sub.Name)
		assert.Equal(t, root.ID, sub.ParentID)

		// Test GetSubfolder
		found, err := docStorage.GetSubfolder(ctx, root.ID, "RFC Documents")
		require.NoError(t, err, "Failed to get subfolder")
		require.NotNil(t, found, "Subfolder should be found")
		assert.Equal(t, sub.ID, found.ID)

		// Test GetSubfolder for nonexistent
		notFound, err := docStorage.GetSubfolder(ctx, root.ID, "Nonexistent")
		require.NoError(t, err, "Should not error for nonexistent subfolder")
		assert.Nil(t, notFound, "Should return nil for nonexistent subfolder")
	})

	t.Run("EmptyFolderName", func(t *testing.T) {
		adapter, cleanup := createTestAdapter(t)
		defer cleanup()

		docStorage := adapter.DocumentStorage()
		_, err := docStorage.CreateFolder(ctx, "", "parent")
		assert.Error(t, err, "Should error with empty folder name")
	})
}

// TestDocumentStorage_Templates tests template-based document creation.
func TestDocumentStorage_Templates(t *testing.T) {
	ctx := context.Background()

	t.Run("CreateDocumentFromTemplate", func(t *testing.T) {
		adapter, cleanup := createTestAdapter(t)
		defer cleanup()

		docStorage := adapter.DocumentStorage()

		// Create template document
		template, err := docStorage.CreateDocument(ctx, &workspace.DocumentCreate{
			Name:           "RFC Template",
			ParentFolderID: "templates",
			Content: `# RFC-XXX: {{title}}

## Author
{{author}}

## Summary
{{summary}}

## Details
...`,
			Owner: "admin@hashicorp.com",
		})
		require.NoError(t, err, "Failed to create template")

		// Create document from template
		doc, err := docStorage.CreateDocument(ctx, &workspace.DocumentCreate{
			Name:           "RFC-100: New Feature",
			ParentFolderID: "rfcs",
			TemplateID:     template.ID,
			Owner:          "engineer@hashicorp.com",
		})
		require.NoError(t, err, "Failed to create document from template")

		// Verify content was copied from template
		assert.Contains(t, doc.Content, "RFC-XXX")
		assert.Contains(t, doc.Content, "{{title}}")
		assert.Contains(t, doc.Content, "{{author}}")

		// Test text replacement
		replacements := map[string]string{
			"title":   "New Feature Implementation",
			"author":  "Jane Engineer",
			"summary": "This RFC proposes a new feature.",
		}
		err = docStorage.ReplaceTextInDocument(ctx, doc.ID, replacements)
		require.NoError(t, err, "Failed to replace text in document")

		// Verify replacements
		updated, err := docStorage.GetDocument(ctx, doc.ID)
		require.NoError(t, err, "Failed to get updated document")
		assert.Contains(t, updated.Content, "New Feature Implementation")
		assert.Contains(t, updated.Content, "Jane Engineer")
		assert.Contains(t, updated.Content, "This RFC proposes a new feature.")
		assert.NotContains(t, updated.Content, "{{title}}")
		assert.NotContains(t, updated.Content, "{{author}}")
	})
}

// createTestAdapter creates a test adapter with a temporary storage directory.
func createTestAdapter(t *testing.T) (*Adapter, func()) {
	t.Helper()

	fs := afero.NewMemMapFs()
	adapter, err := NewAdapter(&Config{
		BasePath:   "/workspace",
		FileSystem: fs,
	})
	require.NoError(t, err, "Failed to create adapter")

	cleanup := func() {
		// No cleanup needed for in-memory filesystem
	}

	return adapter, cleanup
}
