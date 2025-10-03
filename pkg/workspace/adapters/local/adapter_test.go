package localworkspace_test

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/hashicorp-forge/hermes/pkg/storage"
)

func TestFilesystemAdapter(t *testing.T) {
	// Create temporary directory for testing
	tempDir := t.TempDir()

	// Create adapter
	adapter, err := localworkspace.NewAdapter(&localworkspace.Config{
		BasePath: tempDir,
	})
	if err != nil {
		t.Fatalf("Failed to create adapter: %v", err)
	}

	docStorage := adapter.DocumentStorage()
	ctx := context.Background()

	t.Run("CreateDocument", func(t *testing.T) {
		doc, err := docStorage.CreateDocument(ctx, &storage.DocumentCreate{
			Name:           "Test RFC",
			ParentFolderID: "docs",
			Content:        "# RFC-001\n\nThis is a test RFC.",
			Owner:          "test@example.com",
		})

		if err != nil {
			t.Fatalf("Failed to create document: %v", err)
		}

		if doc.ID == "" {
			t.Error("Document ID should not be empty")
		}

		if doc.Name != "Test RFC" {
			t.Errorf("Expected name 'Test RFC', got '%s'", doc.Name)
		}

		// Verify file was created
		docPath := filepath.Join(tempDir, "docs", doc.ID+".md")
		if _, err := os.Stat(docPath); os.IsNotExist(err) {
			t.Error("Document file was not created")
		}
	})

	t.Run("GetDocument", func(t *testing.T) {
		// Create a document first
		created, err := docStorage.CreateDocument(ctx, &storage.DocumentCreate{
			Name:           "Get Test Doc",
			ParentFolderID: "docs",
			Content:        "Test content for retrieval",
			Owner:          "user@example.com",
		})
		if err != nil {
			t.Fatalf("Failed to create document: %v", err)
		}

		// Retrieve it
		doc, err := docStorage.GetDocument(ctx, created.ID)
		if err != nil {
			t.Fatalf("Failed to get document: %v", err)
		}

		if doc.Name != "Get Test Doc" {
			t.Errorf("Expected name 'Get Test Doc', got '%s'", doc.Name)
		}

		if doc.Content != "Test content for retrieval" {
			t.Errorf("Content mismatch: got '%s'", doc.Content)
		}
	})

	t.Run("UpdateDocument", func(t *testing.T) {
		// Create a document
		created, err := docStorage.CreateDocument(ctx, &storage.DocumentCreate{
			Name:           "Update Test",
			ParentFolderID: "docs",
			Content:        "Original content",
			Owner:          "user@example.com",
		})
		if err != nil {
			t.Fatalf("Failed to create document: %v", err)
		}

		// Update it
		newName := "Updated Test"
		newContent := "Updated content"
		updated, err := docStorage.UpdateDocument(ctx, created.ID, &storage.DocumentUpdate{
			Name:    &newName,
			Content: &newContent,
		})
		if err != nil {
			t.Fatalf("Failed to update document: %v", err)
		}

		if updated.Name != "Updated Test" {
			t.Errorf("Expected name 'Updated Test', got '%s'", updated.Name)
		}

		if updated.Content != "Updated content" {
			t.Errorf("Expected updated content, got '%s'", updated.Content)
		}
	})

	t.Run("ReplaceTextInDocument", func(t *testing.T) {
		// Create document with template placeholders
		doc, err := docStorage.CreateDocument(ctx, &storage.DocumentCreate{
			Name:           "Template Doc",
			ParentFolderID: "docs",
			Content:        "Product: {{product}}\nVersion: {{version}}",
			Owner:          "user@example.com",
		})
		if err != nil {
			t.Fatalf("Failed to create document: %v", err)
		}

		// Replace text
		err = docStorage.ReplaceTextInDocument(ctx, doc.ID, map[string]string{
			"product": "Terraform",
			"version": "1.5.0",
		})
		if err != nil {
			t.Fatalf("Failed to replace text: %v", err)
		}

		// Verify replacements
		updated, err := docStorage.GetDocument(ctx, doc.ID)
		if err != nil {
			t.Fatalf("Failed to get document: %v", err)
		}

		expected := "Product: Terraform\nVersion: 1.5.0"
		if updated.Content != expected {
			t.Errorf("Expected content '%s', got '%s'", expected, updated.Content)
		}
	})

	t.Run("CopyDocument", func(t *testing.T) {
		// Create source document
		source, err := docStorage.CreateDocument(ctx, &storage.DocumentCreate{
			Name:           "Source Doc",
			ParentFolderID: "docs",
			Content:        "Content to copy",
			Owner:          "user@example.com",
		})
		if err != nil {
			t.Fatalf("Failed to create source document: %v", err)
		}

		// Copy it
		copied, err := docStorage.CopyDocument(ctx, source.ID, "drafts", "Copied Doc")
		if err != nil {
			t.Fatalf("Failed to copy document: %v", err)
		}

		if copied.ID == source.ID {
			t.Error("Copied document should have different ID")
		}

		if copied.Name != "Copied Doc" {
			t.Errorf("Expected name 'Copied Doc', got '%s'", copied.Name)
		}

		if copied.Content != source.Content {
			t.Error("Content should be copied")
		}

		if copied.ParentFolderID != "drafts" {
			t.Errorf("Expected parent 'drafts', got '%s'", copied.ParentFolderID)
		}
	})

	t.Run("ListDocuments", func(t *testing.T) {
		// Create multiple documents
		for i := 0; i < 3; i++ {
			_, err := docStorage.CreateDocument(ctx, &storage.DocumentCreate{
				Name:           "List Test Doc",
				ParentFolderID: "docs",
				Content:        "Test content",
				Owner:          "user@example.com",
			})
			if err != nil {
				t.Fatalf("Failed to create document: %v", err)
			}
		}

		// List them
		docs, err := docStorage.ListDocuments(ctx, "docs", &storage.ListOptions{})
		if err != nil {
			t.Fatalf("Failed to list documents: %v", err)
		}

		if len(docs) < 3 {
			t.Errorf("Expected at least 3 documents, got %d", len(docs))
		}
	})

	t.Run("ListDocumentsWithFilter", func(t *testing.T) {
		// Create document with known time
		time.Sleep(100 * time.Millisecond)
		filterTime := time.Now()
		time.Sleep(100 * time.Millisecond)

		_, err := docStorage.CreateDocument(ctx, &storage.DocumentCreate{
			Name:           "Recent Doc",
			ParentFolderID: "docs",
			Content:        "Recent content",
			Owner:          "user@example.com",
		})
		if err != nil {
			t.Fatalf("Failed to create document: %v", err)
		}

		// List with time filter
		docs, err := docStorage.ListDocuments(ctx, "docs", &storage.ListOptions{
			ModifiedAfter: &filterTime,
		})
		if err != nil {
			t.Fatalf("Failed to list documents: %v", err)
		}

		if len(docs) < 1 {
			t.Error("Expected at least 1 recent document")
		}
	})

	t.Run("DeleteDocument", func(t *testing.T) {
		// Create document
		doc, err := docStorage.CreateDocument(ctx, &storage.DocumentCreate{
			Name:           "Delete Test",
			ParentFolderID: "docs",
			Content:        "To be deleted",
			Owner:          "user@example.com",
		})
		if err != nil {
			t.Fatalf("Failed to create document: %v", err)
		}

		// Delete it
		err = docStorage.DeleteDocument(ctx, doc.ID)
		if err != nil {
			t.Fatalf("Failed to delete document: %v", err)
		}

		// Verify it's gone
		_, err = docStorage.GetDocument(ctx, doc.ID)
		if err == nil {
			t.Error("Expected error when getting deleted document")
		}
	})

	t.Run("CreateAndGetFolder", func(t *testing.T) {
		folder, err := docStorage.CreateFolder(ctx, "Test Folder", "root")
		if err != nil {
			t.Fatalf("Failed to create folder: %v", err)
		}

		if folder.Name != "Test Folder" {
			t.Errorf("Expected name 'Test Folder', got '%s'", folder.Name)
		}

		// Retrieve it
		retrieved, err := docStorage.GetFolder(ctx, folder.ID)
		if err != nil {
			t.Fatalf("Failed to get folder: %v", err)
		}

		if retrieved.ID != folder.ID {
			t.Error("Retrieved folder ID doesn't match")
		}
	})

	t.Run("GetSubfolder", func(t *testing.T) {
		// Create parent folder
		parent, err := docStorage.CreateFolder(ctx, "Parent", "root")
		if err != nil {
			t.Fatalf("Failed to create parent folder: %v", err)
		}

		// Create subfolder
		_, err = docStorage.CreateFolder(ctx, "Subfolder", parent.ID)
		if err != nil {
			t.Fatalf("Failed to create subfolder: %v", err)
		}

		// Get subfolder by name
		sub, err := docStorage.GetSubfolder(ctx, parent.ID, "Subfolder")
		if err != nil {
			t.Fatalf("Failed to get subfolder: %v", err)
		}

		if sub == nil {
			t.Fatal("Subfolder should be found")
		}

		if sub.Name != "Subfolder" {
			t.Errorf("Expected name 'Subfolder', got '%s'", sub.Name)
		}
	})
}

func TestFilesystemAdapterErrors(t *testing.T) {
	tempDir := t.TempDir()

	adapter, err := localworkspace.NewAdapter(&localworkspace.Config{
		BasePath: tempDir,
	})
	if err != nil {
		t.Fatalf("Failed to create adapter: %v", err)
	}

	docStorage := adapter.DocumentStorage()
	ctx := context.Background()

	t.Run("GetNonexistentDocument", func(t *testing.T) {
		_, err := docStorage.GetDocument(ctx, "nonexistent-id")
		if err == nil {
			t.Error("Expected error for nonexistent document")
		}
	})

	t.Run("DeleteNonexistentDocument", func(t *testing.T) {
		err := docStorage.DeleteDocument(ctx, "nonexistent-id")
		if err == nil {
			t.Error("Expected error when deleting nonexistent document")
		}
	})

	t.Run("CreateDocumentWithEmptyName", func(t *testing.T) {
		_, err := docStorage.CreateDocument(ctx, &storage.DocumentCreate{
			Name:           "",
			ParentFolderID: "docs",
			Content:        "Content",
		})
		if err == nil {
			t.Error("Expected error for empty document name")
		}
	})
}
