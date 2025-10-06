//go:build integration
// +build integration

// Package workspace contains integration tests for workspace adapters.
// These tests verify filesystem-based storage operations.
//
// Usage:
//
//	go test -tags=integration ./tests/integration/workspace/...
package workspace

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/hashicorp-forge/hermes/pkg/workspace"
	"github.com/hashicorp-forge/hermes/pkg/workspace/adapters/local"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestLocalAdapter_BasicUsage demonstrates basic usage of the local filesystem adapter.
func TestLocalAdapter_BasicUsage(t *testing.T) {
	WithTimeout(t, 2*time.Minute, 30*time.Second, func(ctx context.Context, progress func(string)) {
		// Create temporary storage directory
		storageDir := filepath.Join(os.TempDir(), fmt.Sprintf("hermes-test-%d", os.Getpid()))
		err := os.MkdirAll(storageDir, 0755)
		require.NoError(t, err, "Failed to create storage directory")
		defer os.RemoveAll(storageDir) // Cleanup

		progress("Created storage directory")

		// Create filesystem adapter
		adapter, err := local.NewAdapter(&local.Config{
			BasePath: storageDir,
		})
		require.NoError(t, err, "Failed to create adapter")

		// Get document storage
		docStorage := adapter.DocumentStorage()

		t.Run("CreateDocument", func(t *testing.T) {
			progress("Testing CreateDocument")
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

		t.Run("CreateDocumentFromTemplate", func(t *testing.T) {
			progress("Testing CreateDocumentFromTemplate")
			// First create a template
			template, err := docStorage.CreateDocument(ctx, &workspace.DocumentCreate{
				Name:           "RFC Template",
				ParentFolderID: "templates",
				Content: `# {{docType}}-{{number}}: {{title}}

Product: {{product}}
Author: {{author}}
Status: {{status}}

## Summary
[Brief summary here]

## Motivation
[Why is this needed?]

## Design
[How will this work?]`,
				Owner: "admin@hashicorp.com",
			})
			require.NoError(t, err, "Failed to create template")
			assert.Equal(t, "RFC Template", template.Name)

			// Copy template to create a new draft
			draft, err := docStorage.CopyDocument(ctx, template.ID, "drafts", "RFC-002: API Versioning")
			require.NoError(t, err, "Failed to copy template")
			assert.Equal(t, "RFC-002: API Versioning", draft.Name)
			assert.NotEqual(t, template.ID, draft.ID, "Copy should have different ID")

			// Replace template placeholders (keys should NOT include braces - method adds them)
			err = docStorage.ReplaceTextInDocument(ctx, draft.ID, map[string]string{
				"docType": "RFC",
				"number":  "002",
				"title":   "API Versioning",
				"product": "Terraform",
				"author":  "engineer@hashicorp.com",
				"status":  "Draft",
			})
			require.NoError(t, err, "Failed to replace text")

			// Verify replacements
			updated, err := docStorage.GetDocument(ctx, draft.ID)
			require.NoError(t, err, "Failed to get updated document")
			assert.Contains(t, updated.Content, "RFC-002: API Versioning")
			assert.Contains(t, updated.Content, "Product: Terraform")
			assert.Contains(t, updated.Content, "Author: engineer@hashicorp.com")
			assert.NotContains(t, updated.Content, "{{docType}}")
			assert.NotContains(t, updated.Content, "{{title}}")
		})

		t.Run("UpdateDocument", func(t *testing.T) {
			progress("Testing UpdateDocument")
			// Create a document first
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

		t.Run("CreateFolderHierarchy", func(t *testing.T) {
			progress("Testing CreateFolderHierarchy")
			// Create top-level folder
			rfcFolder, err := docStorage.CreateFolder(ctx, "RFC", "root")
			require.NoError(t, err, "Failed to create RFC folder")
			assert.Equal(t, "RFC", rfcFolder.Name)
			assert.NotEmpty(t, rfcFolder.ID)

			// Create subfolder
			productFolder, err := docStorage.CreateFolder(ctx, "Terraform", rfcFolder.ID)
			require.NoError(t, err, "Failed to create Terraform subfolder")
			assert.Equal(t, "Terraform", productFolder.Name)

			// Verify folder exists
			sub, err := docStorage.GetSubfolder(ctx, rfcFolder.ID, "Terraform")
			require.NoError(t, err, "Failed to get subfolder")
			assert.NotNil(t, sub, "Subfolder should exist")
			assert.Equal(t, "Terraform", sub.Name)
			assert.Equal(t, productFolder.ID, sub.ID)
		})

		t.Run("ListDocuments", func(t *testing.T) {
			progress("Testing ListDocuments")
			// Create multiple documents in the same folder
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

		t.Run("GetDocument", func(t *testing.T) {
			progress("Testing GetDocument")
			// Create a document
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

		t.Run("MoveDocument", func(t *testing.T) {
			progress("Testing MoveDocument")
			// Create a document in source folder
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
			// Content should be preserved (though metadata frontmatter may be added by storage)
			assert.Contains(t, moved.Content, "Document to be moved")
		})

		progress("Completed all BasicUsage tests")
	})
}

// TestLocalAdapter_EdgeCases tests edge cases and error handling.
func TestLocalAdapter_EdgeCases(t *testing.T) {
	WithTimeout(t, 2*time.Minute, 30*time.Second, func(ctx context.Context, progress func(string)) {
		storageDir := filepath.Join(os.TempDir(), fmt.Sprintf("hermes-test-edge-%d", os.Getpid()))
		err := os.MkdirAll(storageDir, 0755)
		require.NoError(t, err, "Failed to create storage directory")
		defer os.RemoveAll(storageDir)

		progress("Created edge test storage directory")

		adapter, err := local.NewAdapter(&local.Config{
			BasePath: storageDir,
		})
		require.NoError(t, err, "Failed to create adapter")

		docStorage := adapter.DocumentStorage()

		t.Run("GetNonexistentDocument", func(t *testing.T) {
			progress("Testing GetNonexistentDocument")
			_, err := docStorage.GetDocument(ctx, "nonexistent-id-xyz")
			assert.Error(t, err, "Should error when getting nonexistent document")
		})

		t.Run("UpdateNonexistentDocument", func(t *testing.T) {
			progress("Testing UpdateNonexistentDocument")
			content := "new content"
			_, err := docStorage.UpdateDocument(ctx, "nonexistent-id-xyz", &workspace.DocumentUpdate{
				Content: &content,
			})
			assert.Error(t, err, "Should error when updating nonexistent document")
		})

		t.Run("MoveNonexistentDocument", func(t *testing.T) {
			progress("Testing MoveNonexistentDocument")
			err := docStorage.MoveDocument(ctx, "nonexistent-id-xyz", "dest-folder")
			assert.Error(t, err, "Should error when moving nonexistent document")
		})

		t.Run("CopyNonexistentDocument", func(t *testing.T) {
			progress("Testing CopyNonexistentDocument")
			_, err := docStorage.CopyDocument(ctx, "nonexistent-id-xyz", "dest-folder", "Copy Name")
			assert.Error(t, err, "Should error when copying nonexistent document")
		})

		t.Run("GetSubfolderNonexistent", func(t *testing.T) {
			progress("Testing GetSubfolderNonexistent")
			sub, err := docStorage.GetSubfolder(ctx, "nonexistent-parent", "child")
			require.NoError(t, err, "Should not error on nonexistent subfolder lookup")
			assert.Nil(t, sub, "Should return nil for nonexistent subfolder")
		})

		t.Run("EmptyDocumentName", func(t *testing.T) {
			progress("Testing EmptyDocumentName")
			_, err := docStorage.CreateDocument(ctx, &workspace.DocumentCreate{
				Name:           "",
				ParentFolderID: "test",
				Content:        "content",
				Owner:          "test@hashicorp.com",
			})
			assert.Error(t, err, "Should error when creating document with empty name")
		})

		t.Run("EmptyFolderName", func(t *testing.T) {
			progress("Testing EmptyFolderName")
			_, err := docStorage.CreateFolder(ctx, "", "parent")
			assert.Error(t, err, "Should error when creating folder with empty name")
		})

		t.Run("ListEmptyFolder", func(t *testing.T) {
			progress("Testing ListEmptyFolder")
			docs, err := docStorage.ListDocuments(ctx, "empty-folder-xyz", &workspace.ListOptions{
				PageSize: 10,
			})
			require.NoError(t, err, "Should not error when listing empty folder")
			assert.Empty(t, docs, "Should return empty list for empty folder")
		})

		progress("Completed all EdgeCases tests")
	})
}

// TestLocalAdapter_ConcurrentOperations tests concurrent operations.
func TestLocalAdapter_ConcurrentOperations(t *testing.T) {
	WithTimeout(t, 2*time.Minute, 30*time.Second, func(ctx context.Context, progress func(string)) {
		storageDir := filepath.Join(os.TempDir(), fmt.Sprintf("hermes-test-concurrent-%d", os.Getpid()))
		err := os.MkdirAll(storageDir, 0755)
		require.NoError(t, err, "Failed to create storage directory")
		defer os.RemoveAll(storageDir)

		progress("Created concurrent test storage directory")

		adapter, err := local.NewAdapter(&local.Config{
			BasePath: storageDir,
		})
		require.NoError(t, err, "Failed to create adapter")

		docStorage := adapter.DocumentStorage()

		t.Run("ConcurrentCreates", func(t *testing.T) {
			progress("Testing ConcurrentCreates")
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
			progress("Testing ConcurrentUpdates")
			// Create a document
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
			// Content may have frontmatter, so check if it contains "Updated content"
			assert.True(t, strings.Contains(updated.Content, "Updated content"),
				"Document should have updated content, got: %s", updated.Content)
		})

		progress("Completed all ConcurrentOperations tests")
	})
}
