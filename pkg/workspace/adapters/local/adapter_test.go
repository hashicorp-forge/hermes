package local_test

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/hashicorp-forge/hermes/pkg/workspace"
	"github.com/hashicorp-forge/hermes/pkg/workspace/adapters/local"
	"github.com/stretchr/testify/assert"
)

func TestFilesystemAdapter(t *testing.T) {
	// Create temporary directory for testing
	tempDir := t.TempDir()

	// Create adapter
	adapter, err := local.NewAdapter(&local.Config{
		BasePath: tempDir,
	})
	if err != nil {
		t.Fatalf("Failed to create adapter: %v", err)
	}

	docStorage := adapter.DocumentStorage()
	ctx := context.Background()

	t.Run("CreateDocument", func(t *testing.T) {
		doc, err := docStorage.CreateDocument(ctx, &workspace.DocumentCreate{
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
		created, err := docStorage.CreateDocument(ctx, &workspace.DocumentCreate{
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
		created, err := docStorage.CreateDocument(ctx, &workspace.DocumentCreate{
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
		updated, err := docStorage.UpdateDocument(ctx, created.ID, &workspace.DocumentUpdate{
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
		doc, err := docStorage.CreateDocument(ctx, &workspace.DocumentCreate{
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
		source, err := docStorage.CreateDocument(ctx, &workspace.DocumentCreate{
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
			_, err := docStorage.CreateDocument(ctx, &workspace.DocumentCreate{
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
		docs, err := docStorage.ListDocuments(ctx, "docs", &workspace.ListOptions{})
		if err != nil {
			t.Fatalf("Failed to list documents: %v", err)
		}

		if len(docs) < 3 {
			t.Errorf("Expected at least 3 documents, got %d", len(docs))
		}
	})

	t.Run("ListDocumentsWithFilter", func(t *testing.T) {
		// Create document with known time
		time.Sleep(200 * time.Millisecond)
		filterTime := time.Now()
		time.Sleep(200 * time.Millisecond)

		created, err := docStorage.CreateDocument(ctx, &workspace.DocumentCreate{
			Name:           "Recent Doc",
			ParentFolderID: "docs",
			Content:        "Recent content",
			Owner:          "user@example.com",
		})
		if err != nil {
			t.Fatalf("Failed to create document: %v", err)
		}

		// Verify the document was created after filter time
		if !created.ModifiedTime.After(filterTime) {
			t.Fatalf("Document modified time %v is not after filter time %v", created.ModifiedTime, filterTime)
		}

		// List with time filter
		docs, err := docStorage.ListDocuments(ctx, "docs", &workspace.ListOptions{
			ModifiedAfter: &filterTime,
		})
		if err != nil {
			t.Fatalf("Failed to list documents: %v", err)
		}

		// Find our document
		found := false
		for _, doc := range docs {
			if doc.ID == created.ID {
				found = true
				break
			}
		}

		if !found {
			t.Errorf("Expected to find document %s (created at %v) in list after filter time %v, but got %d documents",
				created.ID, created.ModifiedTime, filterTime, len(docs))
		}
	})

	t.Run("DeleteDocument", func(t *testing.T) {
		// Create document
		doc, err := docStorage.CreateDocument(ctx, &workspace.DocumentCreate{
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
	tests := []struct {
		name    string
		test    func(*testing.T, *local.Adapter)
		wantErr bool
	}{
		{
			name: "GetNonexistentDocument",
			test: func(t *testing.T, adapter *local.Adapter) {
				doc, err := adapter.DocumentStorage().GetDocument(context.Background(), "nonexistent-id")
				assert.Error(t, err)
				assert.Nil(t, doc)
			},
		},
		{
			name: "DeleteNonexistentDocument",
			test: func(t *testing.T, adapter *local.Adapter) {
				err := adapter.DocumentStorage().DeleteDocument(context.Background(), "nonexistent-id")
				assert.Error(t, err)
			},
		},
		{
			name: "CreateDocumentWithEmptyName",
			test: func(t *testing.T, adapter *local.Adapter) {
				doc, err := adapter.DocumentStorage().CreateDocument(context.Background(), &workspace.DocumentCreate{
					Name: "", // Empty name
				})
				assert.Error(t, err)
				assert.Nil(t, doc)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create temporary directory for testing
			tempDir := t.TempDir()

			// Create adapter
			adapter, err := local.NewAdapter(&local.Config{
				BasePath: tempDir,
			})
			if err != nil {
				t.Fatalf("Failed to create adapter: %v", err)
			}
			tt.test(t, adapter)
		})
	}
}

func TestAdapterServiceGetters(t *testing.T) {
	// Create temporary directory for testing
	tempDir := t.TempDir()

	// Create adapter
	adapter, err := local.NewAdapter(&local.Config{
		BasePath: tempDir,
	})
	if err != nil {
		t.Fatalf("Failed to create adapter: %v", err)
	}

	// Test that service getters return non-nil implementations
	t.Run("DocumentStorage", func(t *testing.T) {
		svc := adapter.DocumentStorage()
		assert.NotNil(t, svc)
	})

	t.Run("PeopleService", func(t *testing.T) {
		svc := adapter.PeopleService()
		assert.NotNil(t, svc)
	})

	t.Run("NotificationService", func(t *testing.T) {
		svc := adapter.NotificationService()
		assert.NotNil(t, svc)
	})

	t.Run("AuthService", func(t *testing.T) {
		svc := adapter.AuthService()
		assert.NotNil(t, svc)
	})
}

// TestNewAdapter_ErrorPaths tests error handling in NewAdapter.
func TestNewAdapter_ErrorPaths(t *testing.T) {
	t.Run("InvalidConfig", func(t *testing.T) {
		_, err := local.NewAdapter(&local.Config{
			BasePath: "", // Empty base path should fail validation
		})
		assert.Error(t, err, "Should error on invalid config")
		assert.Contains(t, err.Error(), "invalid configuration")
	})
}
