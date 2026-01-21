package mock

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestProviderCompliance_GetFile tests GetFile method behavior.
func TestProviderCompliance_GetFile(t *testing.T) {
	adapter := NewAdapter()
	adapter.WithFile("test-id", "Test File", "application/vnd.google-apps.document")

	file, err := adapter.GetFile("test-id")
	require.NoError(t, err)
	assert.Equal(t, "test-id", file.Id)
	assert.Equal(t, "Test File", file.Name)

	_, err = adapter.GetFile("non-existent")
	assert.Error(t, err, "should error on non-existent file")
}

// TestProviderCompliance_CopyFile tests CopyFile method behavior.
func TestProviderCompliance_CopyFile(t *testing.T) {
	adapter := NewAdapter()
	adapter.
		WithFile("source", "Source File", "application/vnd.google-apps.document").
		WithFileContent("source", "Original content").
		WithFile("dest-folder", "Destination", "application/vnd.google-apps.folder")

	copied, err := adapter.CopyFile("source", "dest-folder", "Copied File")
	require.NoError(t, err)
	assert.NotEqual(t, "source", copied.Id, "copied file should have different ID")
	assert.Equal(t, "Copied File", copied.Name)
	assert.Contains(t, copied.Parents, "dest-folder")

	// Verify content was copied
	content, err := adapter.GetFileContent(copied.Id)
	require.NoError(t, err)
	assert.Equal(t, "Original content", content)
}

// TestProviderCompliance_MoveFile tests MoveFile method behavior.
func TestProviderCompliance_MoveFile(t *testing.T) {
	adapter := NewAdapter()
	adapter.
		WithFile("file", "Test File", "application/vnd.google-apps.document").
		WithFile("folder1", "Folder 1", "application/vnd.google-apps.folder").
		WithFile("folder2", "Folder 2", "application/vnd.google-apps.folder")

	// Set initial parent
	adapter.Files["file"].Parents = []string{"folder1"}

	moved, err := adapter.MoveFile("file", "folder2")
	require.NoError(t, err)
	assert.Equal(t, "file", moved.Id)
	assert.Contains(t, moved.Parents, "folder2")
	assert.NotContains(t, moved.Parents, "folder1", "old parent should be removed")
}

// TestProviderCompliance_DeleteFile tests DeleteFile method behavior.
func TestProviderCompliance_DeleteFile(t *testing.T) {
	adapter := NewAdapter()
	adapter.
		WithFile("file", "Test File", "application/vnd.google-apps.document").
		WithFileContent("file", "Content")

	err := adapter.DeleteFile("file")
	require.NoError(t, err)

	_, err = adapter.GetFile("file")
	assert.Error(t, err, "file should be deleted")

	_, err = adapter.GetFileContent("file")
	assert.Error(t, err, "file content should be deleted")
}

// TestProviderCompliance_RenameFile tests RenameFile method behavior.
func TestProviderCompliance_RenameFile(t *testing.T) {
	adapter := NewAdapter()
	adapter.WithFile("file", "Old Name", "application/vnd.google-apps.document")

	err := adapter.RenameFile("file", "New Name")
	require.NoError(t, err)

	file, err := adapter.GetFile("file")
	require.NoError(t, err)
	assert.Equal(t, "New Name", file.Name)
}

// TestProviderCompliance_ShareFile tests ShareFile method behavior.
func TestProviderCompliance_ShareFile(t *testing.T) {
	adapter := NewAdapter()
	adapter.WithFile("file", "Test File", "application/vnd.google-apps.document")

	err := adapter.ShareFile("file", "user@example.com", "writer")
	require.NoError(t, err)

	perms, err := adapter.ListPermissions("file")
	require.NoError(t, err)
	require.Len(t, perms, 1)
	assert.Equal(t, "user@example.com", perms[0].EmailAddress)
	assert.Equal(t, "writer", perms[0].Role)
}

// TestProviderCompliance_ListPermissions tests ListPermissions method behavior.
func TestProviderCompliance_ListPermissions(t *testing.T) {
	adapter := NewAdapter()
	adapter.WithFile("file", "Test File", "application/vnd.google-apps.document")

	// Initially no permissions
	perms, err := adapter.ListPermissions("file")
	require.NoError(t, err)
	assert.Len(t, perms, 0)

	// Add some permissions
	adapter.ShareFile("file", "user1@example.com", "reader")
	adapter.ShareFile("file", "user2@example.com", "writer")

	perms, err = adapter.ListPermissions("file")
	require.NoError(t, err)
	assert.Len(t, perms, 2)
}

// TestProviderCompliance_DeletePermission tests DeletePermission method behavior.
func TestProviderCompliance_DeletePermission(t *testing.T) {
	adapter := NewAdapter()
	adapter.WithFile("file", "Test File", "application/vnd.google-apps.document")

	// Add permission
	adapter.ShareFile("file", "user@example.com", "writer")
	perms, _ := adapter.ListPermissions("file")
	require.Len(t, perms, 1)

	// Delete permission
	err := adapter.DeletePermission("file", perms[0].Id)
	require.NoError(t, err)

	perms, _ = adapter.ListPermissions("file")
	assert.Len(t, perms, 0)
}

// TestProviderCompliance_SearchPeople tests SearchPeople method behavior.
func TestProviderCompliance_SearchPeople(t *testing.T) {
	adapter := NewAdapter()
	adapter.WithPerson("user@example.com", "Test User", "https://example.com/photo.jpg")

	people, err := adapter.SearchPeople("user@example.com", "names,emailAddresses")
	require.NoError(t, err)
	require.Len(t, people, 1)
	assert.Equal(t, "Test User", people[0].Names[0].DisplayName)
	assert.Equal(t, "user@example.com", people[0].EmailAddresses[0].Value)
}

// TestProviderCompliance_GetSubfolder tests GetSubfolder method behavior.
func TestProviderCompliance_GetSubfolder(t *testing.T) {
	adapter := NewAdapter()
	adapter.WithSubfolder("parent", "subfolder", "subfolder-id")

	id, err := adapter.GetSubfolder("parent", "subfolder")
	require.NoError(t, err)
	assert.Equal(t, "subfolder-id", id)

	_, err = adapter.GetSubfolder("parent", "non-existent")
	assert.Error(t, err, "should error on non-existent subfolder")
}
