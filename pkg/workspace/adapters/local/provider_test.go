package local

import (
	"context"
	"os"
	"testing"

	"github.com/hashicorp-forge/hermes/pkg/workspace"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// testDocumentCreate is a helper to create DocumentCreate structs for testing.
func testDocumentCreate(name, parentFolderID string) *workspace.DocumentCreate {
	return &workspace.DocumentCreate{
		Name:           name,
		ParentFolderID: parentFolderID,
		Owner:          "test@example.com",
		Content:        "Test content",
	}
}

// TestProviderCompliance_GetFile tests GetFile method behavior.
func TestProviderCompliance_GetFile(t *testing.T) {
	adapter, cleanup := setupTestAdapter(t)
	defer cleanup()

	provider := NewProviderAdapter(adapter)

	// Create a test document
	doc, err := adapter.DocumentStorage().CreateDocument(context.Background(), testDocumentCreate("Test File", ""))
	require.NoError(t, err)

	// Test GetFile
	file, err := provider.GetFile(doc.ID)
	require.NoError(t, err)
	assert.Equal(t, doc.ID, file.Id)
	assert.Equal(t, "Test File", file.Name)

	// Test non-existent file
	_, err = provider.GetFile("non-existent")
	assert.Error(t, err, "should error on non-existent file")
}

// TestProviderCompliance_CopyFile tests CopyFile method behavior.
func TestProviderCompliance_CopyFile(t *testing.T) {
	adapter, cleanup := setupTestAdapter(t)
	defer cleanup()

	provider := NewProviderAdapter(adapter)
	ctx := context.Background()

	// Create source document with content
	srcDoc, err := adapter.DocumentStorage().CreateDocument(ctx, testDocumentCreate("Source File", ""))
	require.NoError(t, err)

	err = adapter.DocumentStorage().UpdateDocumentContent(ctx, srcDoc.ID, "Original content")
	require.NoError(t, err)

	// Create destination folder
	destFolder, err := adapter.DocumentStorage().CreateFolder(ctx, "Dest Folder", "")
	require.NoError(t, err)

	// Test CopyFile
	copied, err := provider.CopyFile(srcDoc.ID, destFolder.ID, "Copied File")
	require.NoError(t, err)
	assert.NotEqual(t, srcDoc.ID, copied.Id, "copied file should have different ID")
	assert.Equal(t, "Copied File", copied.Name)
	assert.Contains(t, copied.Parents, destFolder.ID)

	// Verify content was copied
	content, err := adapter.DocumentStorage().GetDocumentContent(ctx, copied.Id)
	require.NoError(t, err)
	assert.Equal(t, "Original content", content)
}

// TestProviderCompliance_MoveFile tests MoveFile method behavior.
func TestProviderCompliance_MoveFile(t *testing.T) {
	adapter, cleanup := setupTestAdapter(t)
	defer cleanup()

	provider := NewProviderAdapter(adapter)
	ctx := context.Background()

	// Create folders
	folder1, err := adapter.DocumentStorage().CreateFolder(ctx, "Folder 1", "")
	require.NoError(t, err)

	folder2, err := adapter.DocumentStorage().CreateFolder(ctx, "Folder 2", "")
	require.NoError(t, err)

	// Create document in folder1
	doc, err := adapter.DocumentStorage().CreateDocument(ctx, testDocumentCreate("Test File", folder1.ID))
	require.NoError(t, err)

	// Test MoveFile
	moved, err := provider.MoveFile(doc.ID, folder2.ID)
	require.NoError(t, err)
	assert.Equal(t, doc.ID, moved.Id)
	assert.Contains(t, moved.Parents, folder2.ID)

	// Verify the move
	movedDoc, err := adapter.DocumentStorage().GetDocument(ctx, doc.ID)
	require.NoError(t, err)
	assert.Equal(t, folder2.ID, movedDoc.ParentFolderID)
}

// TestProviderCompliance_DeleteFile tests DeleteFile method behavior.
func TestProviderCompliance_DeleteFile(t *testing.T) {
	adapter, cleanup := setupTestAdapter(t)
	defer cleanup()

	provider := NewProviderAdapter(adapter)
	ctx := context.Background()

	// Create document
	doc, err := adapter.DocumentStorage().CreateDocument(ctx, testDocumentCreate("Test File", ""))
	require.NoError(t, err)

	err = adapter.DocumentStorage().UpdateDocumentContent(ctx, doc.ID, "Content")
	require.NoError(t, err)

	// Test DeleteFile
	err = provider.DeleteFile(doc.ID)
	require.NoError(t, err)

	// Verify deletion
	_, err = adapter.DocumentStorage().GetDocument(ctx, doc.ID)
	assert.Error(t, err, "document should be deleted")
}

// TestProviderCompliance_RenameFile tests RenameFile method behavior.
func TestProviderCompliance_RenameFile(t *testing.T) {
	adapter, cleanup := setupTestAdapter(t)
	defer cleanup()

	provider := NewProviderAdapter(adapter)
	ctx := context.Background()

	// Create document
	doc, err := adapter.DocumentStorage().CreateDocument(ctx, testDocumentCreate("Old Name", ""))
	require.NoError(t, err)

	// Test RenameFile
	err = provider.RenameFile(doc.ID, "New Name")
	require.NoError(t, err)

	// Verify rename
	file, err := provider.GetFile(doc.ID)
	require.NoError(t, err)
	assert.Equal(t, "New Name", file.Name)
}

// TestProviderCompliance_ShareFile tests ShareFile method behavior.
func TestProviderCompliance_ShareFile(t *testing.T) {
	adapter, cleanup := setupTestAdapter(t)
	defer cleanup()

	provider := NewProviderAdapter(adapter)
	ctx := context.Background()

	// Create document
	doc, err := adapter.DocumentStorage().CreateDocument(ctx, testDocumentCreate("Test File", ""))
	require.NoError(t, err)

	// Test ShareFile
	err = provider.ShareFile(doc.ID, "user@example.com", "writer")
	require.NoError(t, err)

	// Verify permission was added
	perms, err := provider.ListPermissions(doc.ID)
	require.NoError(t, err)
	require.Len(t, perms, 1)
	assert.Equal(t, "user@example.com", perms[0].EmailAddress)
	assert.Equal(t, "writer", perms[0].Role)
}

// TestProviderCompliance_ListPermissions tests ListPermissions method behavior.
func TestProviderCompliance_ListPermissions(t *testing.T) {
	adapter, cleanup := setupTestAdapter(t)
	defer cleanup()

	provider := NewProviderAdapter(adapter)
	ctx := context.Background()

	// Create document
	doc, err := adapter.DocumentStorage().CreateDocument(ctx, testDocumentCreate("Test File", ""))
	require.NoError(t, err)

	// Initially no permissions
	perms, err := provider.ListPermissions(doc.ID)
	require.NoError(t, err)
	assert.Len(t, perms, 0)

	// Add some permissions
	provider.ShareFile(doc.ID, "user1@example.com", "reader")
	provider.ShareFile(doc.ID, "user2@example.com", "writer")

	// Verify permissions
	perms, err = provider.ListPermissions(doc.ID)
	require.NoError(t, err)
	assert.Len(t, perms, 2)
}

// TestProviderCompliance_DeletePermission tests DeletePermission method behavior.
func TestProviderCompliance_DeletePermission(t *testing.T) {
	adapter, cleanup := setupTestAdapter(t)
	defer cleanup()

	provider := NewProviderAdapter(adapter)
	ctx := context.Background()

	// Create document
	doc, err := adapter.DocumentStorage().CreateDocument(ctx, testDocumentCreate("Test File", ""))
	require.NoError(t, err)

	// Add permission
	provider.ShareFile(doc.ID, "user@example.com", "writer")
	perms, _ := provider.ListPermissions(doc.ID)
	require.Len(t, perms, 1)

	// Delete permission
	err = provider.DeletePermission(doc.ID, perms[0].Id)
	require.NoError(t, err)

	// Verify deletion
	perms, _ = provider.ListPermissions(doc.ID)
	assert.Len(t, perms, 0)
}

// TestProviderCompliance_GetSubfolder tests GetSubfolder method behavior.
func TestProviderCompliance_GetSubfolder(t *testing.T) {
	adapter, cleanup := setupTestAdapter(t)
	defer cleanup()

	provider := NewProviderAdapter(adapter)
	ctx := context.Background()

	// Create parent folder
	parent, err := adapter.DocumentStorage().CreateFolder(ctx, "Parent", "")
	require.NoError(t, err)

	// Create subfolder
	subfolder, err := adapter.DocumentStorage().CreateFolder(ctx, "Subfolder", parent.ID)
	require.NoError(t, err)

	// Test GetSubfolder
	id, err := provider.GetSubfolder(parent.ID, "Subfolder")
	require.NoError(t, err)
	assert.Equal(t, subfolder.ID, id)

	// Test non-existent subfolder
	_, err = provider.GetSubfolder(parent.ID, "NonExistent")
	assert.Error(t, err, "should error on non-existent subfolder")
}

// TestProviderCompliance_SearchPeople tests SearchPeople method behavior.
// Note: This test is skipped because the local adapter's people service
// is not yet fully implemented.
func TestProviderCompliance_SearchPeople(t *testing.T) {
	t.Skip("PeopleService implementation needed")

	adapter, cleanup := setupTestAdapter(t)
	defer cleanup()

	provider := NewProviderAdapter(adapter)

	// Add a user to the directory
	// (This would require implementing user management in the local adapter)

	// Test SearchPeople
	people, err := provider.SearchPeople("user@example.com", "names,emailAddresses")
	require.NoError(t, err)
	require.Len(t, people, 1)
	assert.Equal(t, "user@example.com", people[0].EmailAddresses[0].Value)
}

// setupTestAdapter creates a test adapter with a temporary directory.
func setupTestAdapter(t *testing.T) (*Adapter, func()) {
	t.Helper()

	tempDir, err := os.MkdirTemp("", "hermes-test-*")
	require.NoError(t, err)

	adapter, err := NewAdapter(&Config{
		BasePath: tempDir,
	})
	require.NoError(t, err)

	cleanup := func() {
		os.RemoveAll(tempDir)
	}

	return adapter, cleanup
}
