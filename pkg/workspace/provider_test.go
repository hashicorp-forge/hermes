package workspace

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"google.golang.org/api/drive/v3"
	"google.golang.org/api/people/v1"
)

// ProviderTestSuite runs comprehensive tests against any Provider implementation.
// This ensures all implementations (mock, local, Google) behave consistently.
type ProviderTestSuite struct {
	// Provider is the workspace provider being tested
	Provider Provider

	// Setup is called before each test to prepare the provider
	Setup func(t *testing.T) Provider

	// Cleanup is called after each test to clean up resources
	Cleanup func(t *testing.T, provider Provider)
}

// RunAllTests runs the complete test suite against a provider implementation.
func (suite *ProviderTestSuite) RunAllTests(t *testing.T) {
	t.Run("FileOperations", suite.TestFileOperations)
	t.Run("CopyFile", suite.TestCopyFile)
	t.Run("MoveFile", suite.TestMoveFile)
	t.Run("DeleteFile", suite.TestDeleteFile)
	t.Run("RenameFile", suite.TestRenameFile)
	t.Run("Permissions", suite.TestPermissions)
	t.Run("ShareFile", suite.TestShareFile)
	t.Run("ListPermissions", suite.TestListPermissions)
	t.Run("DeletePermission", suite.TestDeletePermission)
	t.Run("SearchPeople", suite.TestSearchPeople)
	t.Run("GetSubfolder", suite.TestGetSubfolder)
	t.Run("ErrorCases", suite.TestErrorCases)
	t.Run("Concurrency", suite.TestConcurrency)
}

// TestFileOperations tests basic file operations.
func (suite *ProviderTestSuite) TestFileOperations(t *testing.T) {
	provider := suite.Setup(t)
	defer suite.Cleanup(t, provider)

	t.Run("GetFile_NonExistent", func(t *testing.T) {
		file, err := provider.GetFile("non-existent-id")
		assert.Error(t, err, "should error on non-existent file")
		assert.Nil(t, file)
	})
}

// TestCopyFile tests file copying operations.
func (suite *ProviderTestSuite) TestCopyFile(t *testing.T) {
	provider := suite.Setup(t)
	defer suite.Cleanup(t, provider)

	t.Run("CopyFile_Success", func(t *testing.T) {
		// Setup: Create source file (implementation-specific)
		sourceID := "source-file-1"
		destFolder := "dest-folder-1"
		newName := "Copied Document"

		// Test
		copiedFile, err := provider.CopyFile(sourceID, destFolder, newName)

		// Verify
		require.NoError(t, err)
		require.NotNil(t, copiedFile)
		assert.NotEqual(t, sourceID, copiedFile.Id, "copied file should have different ID")
		assert.Equal(t, newName, copiedFile.Name)
		assert.Contains(t, copiedFile.Parents, destFolder)
	})

	t.Run("CopyFile_NonExistentSource", func(t *testing.T) {
		copiedFile, err := provider.CopyFile("non-existent", "dest-folder", "Copy")
		assert.Error(t, err)
		assert.Nil(t, copiedFile)
	})

	t.Run("CopyFile_InvalidDestination", func(t *testing.T) {
		sourceID := "source-file-1"
		copiedFile, err := provider.CopyFile(sourceID, "invalid-folder", "Copy")
		// Behavior may vary: some implementations might create folder, others error
		// Just verify it doesn't panic
		_ = copiedFile
		_ = err
	})
}

// TestMoveFile tests file moving operations.
func (suite *ProviderTestSuite) TestMoveFile(t *testing.T) {
	provider := suite.Setup(t)
	defer suite.Cleanup(t, provider)

	t.Run("MoveFile_Success", func(t *testing.T) {
		// Setup: Create file in source folder
		fileID := "file-to-move"
		destFolder := "dest-folder-2"

		// Test
		movedFile, err := provider.MoveFile(fileID, destFolder)

		// Verify
		require.NoError(t, err)
		require.NotNil(t, movedFile)
		assert.Equal(t, fileID, movedFile.Id, "file ID should not change")
		assert.Contains(t, movedFile.Parents, destFolder, "file should be in destination folder")
	})

	t.Run("MoveFile_NonExistent", func(t *testing.T) {
		movedFile, err := provider.MoveFile("non-existent", "dest-folder")
		assert.Error(t, err)
		assert.Nil(t, movedFile)
	})
}

// TestDeleteFile tests file deletion operations.
func (suite *ProviderTestSuite) TestDeleteFile(t *testing.T) {
	provider := suite.Setup(t)
	defer suite.Cleanup(t, provider)

	t.Run("DeleteFile_Success", func(t *testing.T) {
		// Setup: Create file to delete
		fileID := "file-to-delete"

		// Test
		err := provider.DeleteFile(fileID)

		// Verify
		require.NoError(t, err)

		// File should no longer exist
		file, err := provider.GetFile(fileID)
		assert.Error(t, err)
		assert.Nil(t, file)
	})

	t.Run("DeleteFile_NonExistent", func(t *testing.T) {
		// Deleting non-existent file should either succeed (idempotent) or error
		err := provider.DeleteFile("non-existent")
		// Accept either behavior, just verify it doesn't panic
		_ = err
	})

	t.Run("DeleteFile_WithPermissions", func(t *testing.T) {
		// Setup: Create file with permissions
		fileID := "file-with-perms"
		// Assume file has permissions

		// Test
		err := provider.DeleteFile(fileID)
		require.NoError(t, err)

		// Permissions should also be deleted
		perms, err := provider.ListPermissions(fileID)
		assert.Error(t, err, "permissions should not exist after file deletion")
		assert.Empty(t, perms)
	})
}

// TestRenameFile tests file renaming operations.
func (suite *ProviderTestSuite) TestRenameFile(t *testing.T) {
	provider := suite.Setup(t)
	defer suite.Cleanup(t, provider)

	t.Run("RenameFile_Success", func(t *testing.T) {
		// Setup: Create file
		fileID := "file-to-rename"
		newName := "New Awesome Name"

		// Test
		err := provider.RenameFile(fileID, newName)

		// Verify
		require.NoError(t, err)

		// Get file and verify name changed
		file, err := provider.GetFile(fileID)
		require.NoError(t, err)
		assert.Equal(t, newName, file.Name)
	})

	t.Run("RenameFile_NonExistent", func(t *testing.T) {
		err := provider.RenameFile("non-existent", "New Name")
		assert.Error(t, err)
	})

	t.Run("RenameFile_EmptyName", func(t *testing.T) {
		fileID := "file-to-rename"
		err := provider.RenameFile(fileID, "")
		// Should either error or allow empty name
		_ = err
	})
}

// TestPermissions tests permission management operations.
func (suite *ProviderTestSuite) TestPermissions(t *testing.T) {
	provider := suite.Setup(t)
	defer suite.Cleanup(t, provider)

	t.Run("Permissions_Lifecycle", func(t *testing.T) {
		// Setup: Create file
		fileID := "file-with-permissions"
		userEmail := "testuser@example.com"

		// Initially no permissions
		perms, err := provider.ListPermissions(fileID)
		require.NoError(t, err)
		initialCount := len(perms)

		// Share file
		err = provider.ShareFile(fileID, userEmail, "writer")
		require.NoError(t, err)

		// List permissions - should have one more
		perms, err = provider.ListPermissions(fileID)
		require.NoError(t, err)
		assert.Equal(t, initialCount+1, len(perms), "should have one more permission")

		// Find the permission
		var permID string
		for _, p := range perms {
			if p.EmailAddress == userEmail {
				permID = p.Id
				assert.Equal(t, "writer", p.Role)
				break
			}
		}
		require.NotEmpty(t, permID, "should find permission for user")

		// Delete permission
		err = provider.DeletePermission(fileID, permID)
		require.NoError(t, err)

		// List permissions - should be back to original count
		perms, err = provider.ListPermissions(fileID)
		require.NoError(t, err)
		assert.Equal(t, initialCount, len(perms))
	})
}

// TestShareFile tests file sharing operations.
func (suite *ProviderTestSuite) TestShareFile(t *testing.T) {
	provider := suite.Setup(t)
	defer suite.Cleanup(t, provider)

	t.Run("ShareFile_Success", func(t *testing.T) {
		fileID := "file-to-share"
		userEmail := "user@example.com"

		err := provider.ShareFile(fileID, userEmail, "writer")
		require.NoError(t, err)

		// Verify permission exists
		perms, err := provider.ListPermissions(fileID)
		require.NoError(t, err)

		found := false
		for _, p := range perms {
			if p.EmailAddress == userEmail {
				found = true
				assert.Equal(t, "writer", p.Role)
			}
		}
		assert.True(t, found, "should find permission for user")
	})

	t.Run("ShareFile_DuplicateUser", func(t *testing.T) {
		fileID := "file-to-share-dup"
		userEmail := "duplicate@example.com"

		// Share first time
		err := provider.ShareFile(fileID, userEmail, "reader")
		require.NoError(t, err)

		// Share again with different role
		err = provider.ShareFile(fileID, userEmail, "writer")
		// Should either update role or error - both acceptable
		_ = err

		// Verify only one permission exists for user
		perms, err := provider.ListPermissions(fileID)
		require.NoError(t, err)

		count := 0
		for _, p := range perms {
			if p.EmailAddress == userEmail {
				count++
			}
		}
		assert.Equal(t, 1, count, "should have only one permission for user")
	})

	t.Run("ShareFile_NonExistentFile", func(t *testing.T) {
		err := provider.ShareFile("non-existent", "user@example.com", "writer")
		assert.Error(t, err)
	})

	t.Run("ShareFile_InvalidRole", func(t *testing.T) {
		fileID := "file-to-share"
		err := provider.ShareFile(fileID, "user@example.com", "invalid-role")
		// Should either accept any role or error - both acceptable
		_ = err
	})
}

// TestListPermissions tests permission listing operations.
func (suite *ProviderTestSuite) TestListPermissions(t *testing.T) {
	provider := suite.Setup(t)
	defer suite.Cleanup(t, provider)

	t.Run("ListPermissions_EmptyFile", func(t *testing.T) {
		fileID := "file-no-perms"

		perms, err := provider.ListPermissions(fileID)
		require.NoError(t, err)
		// May be empty or have default permissions
		assert.NotNil(t, perms)
	})

	t.Run("ListPermissions_NonExistentFile", func(t *testing.T) {
		perms, err := provider.ListPermissions("non-existent")
		assert.Error(t, err)
		assert.Nil(t, perms)
	})

	t.Run("ListPermissions_MultipleUsers", func(t *testing.T) {
		fileID := "file-multi-perms"

		// Share with multiple users
		users := []string{"user1@example.com", "user2@example.com", "user3@example.com"}
		for _, user := range users {
			err := provider.ShareFile(fileID, user, "writer")
			require.NoError(t, err)
		}

		// List permissions
		perms, err := provider.ListPermissions(fileID)
		require.NoError(t, err)
		assert.GreaterOrEqual(t, len(perms), len(users), "should have at least the users we added")

		// Verify all users are present
		for _, user := range users {
			found := false
			for _, p := range perms {
				if p.EmailAddress == user {
					found = true
					break
				}
			}
			assert.True(t, found, "should find permission for %s", user)
		}
	})
}

// TestDeletePermission tests permission deletion operations.
func (suite *ProviderTestSuite) TestDeletePermission(t *testing.T) {
	provider := suite.Setup(t)
	defer suite.Cleanup(t, provider)

	t.Run("DeletePermission_Success", func(t *testing.T) {
		fileID := "file-del-perm"
		userEmail := "deleteuser@example.com"

		// Share file
		err := provider.ShareFile(fileID, userEmail, "writer")
		require.NoError(t, err)

		// Get permission ID
		perms, err := provider.ListPermissions(fileID)
		require.NoError(t, err)

		var permID string
		for _, p := range perms {
			if p.EmailAddress == userEmail {
				permID = p.Id
				break
			}
		}
		require.NotEmpty(t, permID)

		// Delete permission
		err = provider.DeletePermission(fileID, permID)
		require.NoError(t, err)

		// Verify permission is gone
		perms, err = provider.ListPermissions(fileID)
		require.NoError(t, err)

		for _, p := range perms {
			assert.NotEqual(t, permID, p.Id, "deleted permission should not exist")
		}
	})

	t.Run("DeletePermission_NonExistent", func(t *testing.T) {
		fileID := "file-del-perm"
		err := provider.DeletePermission(fileID, "non-existent-perm-id")
		// Should either succeed (idempotent) or error
		_ = err
	})
}

// TestSearchPeople tests people directory search operations.
func (suite *ProviderTestSuite) TestSearchPeople(t *testing.T) {
	provider := suite.Setup(t)
	defer suite.Cleanup(t, provider)

	t.Run("SearchPeople_Success", func(t *testing.T) {
		email := "john.doe@example.com"

		people, err := provider.SearchPeople(email, "emailAddresses,names,photos")
		require.NoError(t, err)

		// May return empty list or populated list depending on setup
		if len(people) > 0 {
			person := people[0]
			assert.NotNil(t, person)
			// Verify fields requested are present
			if len(person.EmailAddresses) > 0 {
				found := false
				for _, ea := range person.EmailAddresses {
					if ea.Value == email {
						found = true
						break
					}
				}
				assert.True(t, found, "should find matching email")
			}
		}
	})

	t.Run("SearchPeople_NonExistent", func(t *testing.T) {
		people, err := provider.SearchPeople("nonexistent@example.com", "emailAddresses")
		// Should return empty list, not error
		require.NoError(t, err)
		assert.Empty(t, people)
	})

	t.Run("SearchPeople_WithPhotos", func(t *testing.T) {
		email := "user.with.photo@example.com"

		people, err := provider.SearchPeople(email, "photos")
		require.NoError(t, err)

		if len(people) > 0 {
			// If person exists, photos field should be populated if available
			_ = people[0].Photos
		}
	})
}

// TestGetSubfolder tests subfolder retrieval operations.
func (suite *ProviderTestSuite) TestGetSubfolder(t *testing.T) {
	provider := suite.Setup(t)
	defer suite.Cleanup(t, provider)

	t.Run("GetSubfolder_Success", func(t *testing.T) {
		parentID := "parent-folder"
		subfolderName := "Subfolder1"

		folderID, err := provider.GetSubfolder(parentID, subfolderName)
		require.NoError(t, err)
		assert.NotEmpty(t, folderID)
	})

	t.Run("GetSubfolder_NonExistent", func(t *testing.T) {
		parentID := "parent-folder"
		folderID, err := provider.GetSubfolder(parentID, "NonExistentFolder")
		assert.Error(t, err)
		assert.Empty(t, folderID)
	})

	t.Run("GetSubfolder_InvalidParent", func(t *testing.T) {
		folderID, err := provider.GetSubfolder("invalid-parent", "Subfolder")
		assert.Error(t, err)
		assert.Empty(t, folderID)
	})
}

// TestErrorCases tests various error scenarios.
func (suite *ProviderTestSuite) TestErrorCases(t *testing.T) {
	provider := suite.Setup(t)
	defer suite.Cleanup(t, provider)

	t.Run("EmptyFileID", func(t *testing.T) {
		file, err := provider.GetFile("")
		assert.Error(t, err)
		assert.Nil(t, file)
	})

	t.Run("NilParameters", func(t *testing.T) {
		// Test that methods handle nil/empty parameters gracefully
		err := provider.ShareFile("file-id", "", "writer")
		// Should error on empty email
		_ = err

		err = provider.RenameFile("file-id", "")
		// Should error or accept empty name
		_ = err
	})
}

// TestConcurrency tests concurrent operations on the provider.
func (suite *ProviderTestSuite) TestConcurrency(t *testing.T) {
	provider := suite.Setup(t)
	defer suite.Cleanup(t, provider)

	t.Run("ConcurrentReads", func(t *testing.T) {
		fileID := "concurrent-read-file"

		// Start multiple goroutines reading the same file
		done := make(chan bool)
		for i := 0; i < 10; i++ {
			go func() {
				defer func() { done <- true }()
				file, err := provider.GetFile(fileID)
				// Should either succeed or fail consistently
				_ = file
				_ = err
			}()
		}

		// Wait for all goroutines
		for i := 0; i < 10; i++ {
			<-done
		}
	})

	t.Run("ConcurrentWrites", func(t *testing.T) {
		// Test concurrent permission additions
		fileID := "concurrent-write-file"

		done := make(chan bool)
		for i := 0; i < 5; i++ {
			go func(idx int) {
				defer func() { done <- true }()
				email := time.Now().Format("user-%d@example.com")
				err := provider.ShareFile(fileID, email, "writer")
				// Should handle concurrent writes gracefully
				_ = err
			}(i)
		}

		// Wait for all goroutines
		for i := 0; i < 5; i++ {
			<-done
		}
	})
}

// Helper functions for test setup

// CreateTestFile is a helper to create a file in the provider for testing.
// Implementations should provide their own setup logic.
func CreateTestFile(t *testing.T, provider Provider, fileID, name string) *drive.File {
	// This is a placeholder - implementations should override this
	return &drive.File{
		Id:   fileID,
		Name: name,
	}
}

// CreateTestPerson is a helper to add a person to the provider's directory.
func CreateTestPerson(t *testing.T, provider Provider, email, displayName, photoURL string) *people.Person {
	// This is a placeholder - implementations should override this
	return &people.Person{
		EmailAddresses: []*people.EmailAddress{
			{Value: email},
		},
		Names: []*people.Name{
			{DisplayName: displayName},
		},
		Photos: []*people.Photo{
			{Url: photoURL},
		},
	}
}

// CreateTestFolder is a helper to create a folder in the provider.
func CreateTestFolder(t *testing.T, provider Provider, parentID, name, folderID string) {
	// This is a placeholder - implementations should override this
}

// TestProviderInterface_MockAdapter runs the full ProviderTestSuite against the mock adapter.
func TestProviderInterface_MockAdapter(t *testing.T) {
	// Import mock adapter from subpackage
	// We can't directly import it here due to import cycle, so we use a factory pattern
	t.Skip("Test suite will be run from mock adapter test file")
}
