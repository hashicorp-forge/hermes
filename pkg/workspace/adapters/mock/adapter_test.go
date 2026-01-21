package mock

import (
	"testing"

	"github.com/hashicorp-forge/hermes/pkg/workspace"
	"github.com/stretchr/testify/require"
)

// TestMockAdapter_ProviderInterface tests that mock adapter implements Provider interface.
func TestMockAdapter_ProviderInterface(t *testing.T) {
	var _ workspace.Provider = (*Adapter)(nil)
}

// TestMockAdapter_WithFile tests the builder pattern for adding files.
func TestMockAdapter_WithFile(t *testing.T) {
	adapter := NewAdapter()

	// Add a file
	adapter.WithFile("test-file-1", "Test Document", "application/vnd.google-apps.document")

	// Verify file exists
	file, err := adapter.GetFile("test-file-1")
	require.NoError(t, err)
	require.NotNil(t, file)
	require.Equal(t, "test-file-1", file.Id)
	require.Equal(t, "Test Document", file.Name)
	require.Equal(t, "application/vnd.google-apps.document", file.MimeType)
}

// TestMockAdapter_WithFileContent tests adding file content.
func TestMockAdapter_WithFileContent(t *testing.T) {
	adapter := NewAdapter()

	// Add file with content
	adapter.WithFile("test-file-2", "Doc With Content", "text/plain").
		WithFileContent("test-file-2", "Hello, World!")

	// Verify content exists (implementation-specific, adapter stores in FileContents map)
	require.Contains(t, adapter.FileContents, "test-file-2")
	require.Equal(t, "Hello, World!", adapter.FileContents["test-file-2"])
}

// TestMockAdapter_CopyFile tests file copying with content preservation.
func TestMockAdapter_CopyFile(t *testing.T) {
	adapter := NewAdapter()

	// Setup source file with content
	sourceID := "source-doc"
	sourceContent := "Important content"
	adapter.WithFile(sourceID, "Source Doc", "text/plain").
		WithFileContent(sourceID, sourceContent)

	// Copy file
	copied, err := adapter.CopyFile(sourceID, "dest-folder", "Copied Doc")
	require.NoError(t, err)
	require.NotNil(t, copied)
	require.NotEqual(t, sourceID, copied.Id)
	require.Equal(t, "Copied Doc", copied.Name)

	// Verify content was copied
	require.Contains(t, adapter.FileContents, copied.Id)
	require.Equal(t, sourceContent, adapter.FileContents[copied.Id])
}

// TestMockAdapter_DeleteFile_CleansUpContent tests that delete removes content.
func TestMockAdapter_DeleteFile_CleansUpContent(t *testing.T) {
	adapter := NewAdapter()

	// Setup file with content
	fileID := "file-with-content"
	adapter.WithFile(fileID, "Doc", "text/plain").
		WithFileContent(fileID, "Content to delete")

	// Verify content exists
	require.Contains(t, adapter.FileContents, fileID)

	// Delete file
	err := adapter.DeleteFile(fileID)
	require.NoError(t, err)

	// Verify content was deleted
	require.NotContains(t, adapter.FileContents, fileID)
	require.NotContains(t, adapter.Files, fileID)
}

// TestMockAdapter_ShareFile_DuplicatePrevention tests that sharing same user twice doesn't create duplicates.
func TestMockAdapter_ShareFile_DuplicatePrevention(t *testing.T) {
	adapter := NewAdapter()

	fileID := "file-share-dup-test"
	adapter.WithFile(fileID, "Test File", "text/plain")

	userEmail := "test@example.com"

	// Share first time
	err := adapter.ShareFile(fileID, userEmail, "reader")
	require.NoError(t, err)

	// Get initial permission count
	perms1, err := adapter.ListPermissions(fileID)
	require.NoError(t, err)
	count1 := len(perms1)

	// Share again with different role
	err = adapter.ShareFile(fileID, userEmail, "writer")
	require.NoError(t, err)

	// Verify no duplicate
	perms2, err := adapter.ListPermissions(fileID)
	require.NoError(t, err)
	require.Equal(t, count1, len(perms2), "should not create duplicate permission")

	// Verify role was updated
	found := false
	for _, p := range perms2 {
		if p.EmailAddress == userEmail {
			found = true
			require.Equal(t, "writer", p.Role, "role should be updated")
		}
	}
	require.True(t, found)
}

// TestMockAdapter_ListFiles tests the ListFiles helper method.
func TestMockAdapter_ListFiles(t *testing.T) {
	adapter := NewAdapter()

	// Add some files
	adapter.WithFile("file-1", "File 1", "text/plain").
		WithFile("file-2", "File 2", "text/plain").
		WithFile("file-3", "File 3", "text/plain")

	// List files
	files := adapter.ListFiles()
	require.Len(t, files, 3)

	// Verify all files are present
	fileIDs := make(map[string]bool)
	for _, file := range files {
		fileIDs[file.Id] = true
	}
	require.True(t, fileIDs["file-1"])
	require.True(t, fileIDs["file-2"])
	require.True(t, fileIDs["file-3"])
}

// TestMockAdapter_WithPerson tests adding people to the directory.
func TestMockAdapter_WithPerson(t *testing.T) {
	adapter := NewAdapter()

	email := "jane.smith@example.com"
	name := "Jane Smith"
	photo := "https://example.com/photos/jane.jpg"

	adapter.WithPerson(email, name, photo)

	// Search for person
	people, err := adapter.SearchPeople(email, "emailAddresses,names,photos")
	require.NoError(t, err)
	require.Len(t, people, 1)

	person := people[0]
	require.NotNil(t, person)

	// Verify email
	require.Len(t, person.EmailAddresses, 1)
	require.Equal(t, email, person.EmailAddresses[0].Value)

	// Verify name
	require.Len(t, person.Names, 1)
	require.Equal(t, name, person.Names[0].DisplayName)

	// Verify photo
	require.Len(t, person.Photos, 1)
	require.Equal(t, photo, person.Photos[0].Url)
}

// TestMockAdapter_WithSubfolder tests folder hierarchy.
func TestMockAdapter_WithSubfolder(t *testing.T) {
	adapter := NewAdapter()

	parentID := "root-folder"
	folderName := "Subfolder A"
	folderID := "subfolder-a-id"

	adapter.WithSubfolder(parentID, folderName, folderID)

	// Get subfolder
	retrievedID, err := adapter.GetSubfolder(parentID, folderName)
	require.NoError(t, err)
	require.Equal(t, folderID, retrievedID)
}

// TestMockAdapter_GetSubfolder_NonExistent tests error handling for missing subfolders.
func TestMockAdapter_GetSubfolder_NonExistent(t *testing.T) {
	adapter := NewAdapter()

	adapter.WithSubfolder("parent-1", "Existing", "existing-id")

	// Try to get non-existent subfolder
	_, err := adapter.GetSubfolder("parent-1", "NonExistent")
	require.Error(t, err)
	require.Contains(t, err.Error(), "subfolder not found")
}

// TestMockAdapter_MoveFile_UpdatesParents tests that move updates parent references.
func TestMockAdapter_MoveFile_UpdatesParents(t *testing.T) {
	adapter := NewAdapter()

	fileID := "movable-file"
	oldParent := "old-parent"
	newParent := "new-parent"

	// Create file in old parent
	adapter.WithFile(fileID, "Movable", "text/plain")
	adapter.Files[fileID].Parents = []string{oldParent}

	// Move file
	movedFile, err := adapter.MoveFile(fileID, newParent)
	require.NoError(t, err)
	require.NotNil(t, movedFile)

	// Verify parents updated
	require.Contains(t, movedFile.Parents, newParent)
	require.NotContains(t, movedFile.Parents, oldParent)
}

// TestMockAdapter_RenameFile_UpdatesModifiedTime tests that rename updates timestamp.
func TestMockAdapter_RenameFile_UpdatesModifiedTime(t *testing.T) {
	adapter := NewAdapter()

	fileID := "file-to-rename-time"
	adapter.WithFile(fileID, "Original Name", "text/plain")

	// Rename file
	err := adapter.RenameFile(fileID, "New Name")
	require.NoError(t, err)

	// Get updated file
	file2, _ := adapter.GetFile(fileID)

	// Verify name changed
	require.Equal(t, "New Name", file2.Name)

	// Verify modified time was set
	require.NotEmpty(t, file2.ModifiedTime)
}

// TestMockAdapter_DeleteFile_RemovesPermissions tests cascading delete.
func TestMockAdapter_DeleteFile_RemovesPermissions(t *testing.T) {
	adapter := NewAdapter()

	fileID := "file-with-perms-delete"
	adapter.WithFile(fileID, "File", "text/plain")

	// Add some permissions
	err := adapter.ShareFile(fileID, "user1@example.com", "writer")
	require.NoError(t, err)
	err = adapter.ShareFile(fileID, "user2@example.com", "reader")
	require.NoError(t, err)

	// Verify permissions exist
	perms, err := adapter.ListPermissions(fileID)
	require.NoError(t, err)
	require.Greater(t, len(perms), 0)

	// Delete file
	err = adapter.DeleteFile(fileID)
	require.NoError(t, err)

	// Verify permissions removed
	require.NotContains(t, adapter.Permissions, fileID)
}
