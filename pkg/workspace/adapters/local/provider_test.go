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

// TestProviderCompliance_SearchPeople_Initial is a minimal placeholder for SearchPeople.
// The comprehensive test is at the end of the file.
func TestProviderCompliance_SearchPeople_Initial(t *testing.T) {
	adapter, cleanup := setupTestAdapter(t)
	defer cleanup()

	provider := NewProviderAdapter(adapter)

	// Create users.json file - note: people service expects map, not array
	usersJSON := `{
		"user@example.com": {
			"email": "user@example.com",
			"name": "Test User",
			"givenName": "Test",
			"familyName": "User",
			"isActive": true
		}
	}`
	err := os.WriteFile(adapter.usersPath, []byte(usersJSON), 0644)
	require.NoError(t, err)

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

// TestProviderCompliance_CreateFileAsUser tests the CreateFileAsUser method.
func TestProviderCompliance_CreateFileAsUser(t *testing.T) {
	ctx := context.Background()

	t.Run("BasicUsage", func(t *testing.T) {
		adapter, cleanup := setupTestAdapter(t)
		defer cleanup()

		provider := NewProviderAdapter(adapter)
		docStorage := adapter.DocumentStorage()

		// Create a template document
		template, err := docStorage.CreateDocument(ctx, &workspace.DocumentCreate{
			Name:           "RFC Template",
			ParentFolderID: "templates",
			Content: `# RFC-XXX: Template

## Summary
This is a template document.

## Author
Author placeholder

## Status
Draft`,
			Owner: "admin@hashicorp.com",
		})
		require.NoError(t, err, "Failed to create template")

		// Create a document as a specific user
		userEmail := "engineer@hashicorp.com"
		newFile, err := provider.CreateFileAsUser(
			template.ID,
			"drafts",
			"RFC-100: User Created Document",
			userEmail,
		)
		require.NoError(t, err, "Failed to create file as user")
		require.NotNil(t, newFile, "Created file should not be nil")

		// Verify the file was created
		assert.NotEmpty(t, newFile.Id, "File should have an ID")
		assert.Equal(t, "RFC-100: User Created Document", newFile.Name)

		// Verify the document exists in storage
		doc, err := docStorage.GetDocument(ctx, newFile.Id)
		require.NoError(t, err, "Failed to retrieve created document")
		assert.Equal(t, "RFC-100: User Created Document", doc.Name)

		// Verify owner metadata was set
		assert.NotNil(t, doc.Metadata, "Metadata should be set")
		createdAsUser, ok := doc.Metadata["created_as_user"]
		assert.True(t, ok, "Metadata should contain created_as_user field")
		assert.Equal(t, userEmail, createdAsUser, "created_as_user should match specified user")

		// Verify content was copied from template
		assert.Contains(t, doc.Content, "RFC-XXX: Template", "Content should be copied from template")
		assert.Contains(t, doc.Content, "This is a template document", "Content should match template")
	})

	t.Run("DifferentUsers", func(t *testing.T) {
		adapter, cleanup := setupTestAdapter(t)
		defer cleanup()

		provider := NewProviderAdapter(adapter)
		docStorage := adapter.DocumentStorage()

		// Create a shared template
		template, err := docStorage.CreateDocument(ctx, &workspace.DocumentCreate{
			Name:           "PRD Template",
			ParentFolderID: "templates",
			Content:        "# Product Requirements Document\n\nTemplate content here.",
			Owner:          "admin@hashicorp.com",
		})
		require.NoError(t, err, "Failed to create template")

		// Create documents as different users
		users := []string{
			"alice@hashicorp.com",
			"bob@hashicorp.com",
			"charlie@hashicorp.com",
		}

		createdFiles := make([]string, len(users))

		for i, userEmail := range users {
			newFile, err := provider.CreateFileAsUser(
				template.ID,
				"drafts",
				"PRD-"+userEmail,
				userEmail,
			)
			require.NoError(t, err, "Failed to create file for user %s", userEmail)
			createdFiles[i] = newFile.Id

			// Verify owner metadata
			doc, err := docStorage.GetDocument(ctx, newFile.Id)
			require.NoError(t, err, "Failed to get document for user %s", userEmail)
			assert.Equal(t, userEmail, doc.Metadata["created_as_user"],
				"Owner should match for user %s", userEmail)
		}

		// Verify all documents are independent
		uniqueIDs := make(map[string]bool)
		for _, id := range createdFiles {
			uniqueIDs[id] = true
		}
		assert.Equal(t, len(users), len(uniqueIDs), "All documents should have unique IDs")
	})

	t.Run("NonexistentTemplate", func(t *testing.T) {
		adapter, cleanup := setupTestAdapter(t)
		defer cleanup()

		provider := NewProviderAdapter(adapter)

		// Try to create a file from a nonexistent template
		_, err := provider.CreateFileAsUser(
			"nonexistent-template-id",
			"drafts",
			"This Should Fail",
			"user@hashicorp.com",
		)
		assert.Error(t, err, "Should return error for nonexistent template")
	})

	t.Run("PreservesContent", func(t *testing.T) {
		adapter, cleanup := setupTestAdapter(t)
		defer cleanup()

		provider := NewProviderAdapter(adapter)
		docStorage := adapter.DocumentStorage()

		// Create a template with specific content
		templateContent := `# Detailed Template

This template has special content.`

		template, err := docStorage.CreateDocument(ctx, &workspace.DocumentCreate{
			Name:           "Detailed Template",
			ParentFolderID: "templates",
			Content:        templateContent,
			Owner:          "admin@hashicorp.com",
		})
		require.NoError(t, err, "Failed to create template")

		// Create file as user
		newFile, err := provider.CreateFileAsUser(
			template.ID,
			"drafts",
			"Copy of Detailed Template",
			"tester@hashicorp.com",
		)
		require.NoError(t, err, "Failed to create file")

		// Verify content is preserved
		doc, err := docStorage.GetDocument(ctx, newFile.Id)
		require.NoError(t, err, "Failed to get document")
		assert.Contains(t, doc.Content, "# Detailed Template")
		assert.Contains(t, doc.Content, "special content")

		// Verify user metadata is set
		assert.Equal(t, "tester@hashicorp.com", doc.Metadata["created_as_user"])
	})
}

// TestProviderCompliance_SearchPeople tests SearchPeople method behavior.
func TestProviderCompliance_SearchPeople(t *testing.T) {
	adapter, cleanup := setupTestAdapter(t)
	defer cleanup()

	provider := NewProviderAdapter(adapter)

	// Create users.json file - map format, not array
	usersJSON := `{
		"john.doe@example.com": {
			"email": "john.doe@example.com",
			"name": "John Doe",
			"givenName": "John",
			"familyName": "Doe",
			"photoURL": "https://example.com/photo.jpg",
			"isActive": true
		},
		"jane.smith@example.com": {
			"email": "jane.smith@example.com",
			"name": "Jane Smith",
			"givenName": "Jane",
			"familyName": "Smith",
			"isActive": true
		}
	}`
	err := os.WriteFile(adapter.usersPath, []byte(usersJSON), 0644)
	require.NoError(t, err)

	// Test search by email
	people, err := provider.SearchPeople("john.doe@example.com", "emailAddresses,names")
	require.NoError(t, err)
	assert.Len(t, people, 1)
	assert.Equal(t, "john.doe@example.com", people[0].EmailAddresses[0].Value)

	// Test partial email match
	people, err = provider.SearchPeople("example.com", "emailAddresses,names")
	require.NoError(t, err)
	assert.Len(t, people, 2)

	// Test search by name
	people, err = provider.SearchPeople("Jane", "emailAddresses,names")
	require.NoError(t, err)
	assert.Len(t, people, 1)
	assert.Equal(t, "Jane Smith", people[0].Names[0].DisplayName)

	// Test no matches
	people, err = provider.SearchPeople("nonexistent", "emailAddresses,names")
	require.NoError(t, err)
	assert.Empty(t, people)
}

// TestProviderCompliance_SearchDirectory tests SearchDirectory method behavior.
func TestProviderCompliance_SearchDirectory(t *testing.T) {
	adapter, cleanup := setupTestAdapter(t)
	defer cleanup()

	provider := NewProviderAdapter(adapter)

	// Create users.json file - map format, not array
	usersJSON := `{
		"alice@example.com": {
			"email": "alice@example.com",
			"name": "Alice Anderson",
			"givenName": "Alice",
			"familyName": "Anderson",
			"isActive": true
		},
		"bob@example.com": {
			"email": "bob@example.com",
			"name": "Bob Brown",
			"givenName": "Bob",
			"familyName": "Brown",
			"isActive": true
		},
		"charlie@example.com": {
			"email": "charlie@example.com",
			"name": "Charlie Chen",
			"givenName": "Charlie",
			"familyName": "Chen",
			"isActive": false
		}
	}`
	err := os.WriteFile(adapter.usersPath, []byte(usersJSON), 0644)
	require.NoError(t, err)

	// Test basic query
	people, err := provider.SearchDirectory(workspace.PeopleSearchOptions{
		Query: "Alice",
	})
	require.NoError(t, err)
	assert.Len(t, people, 1)
	assert.Equal(t, "alice@example.com", people[0].EmailAddresses[0].Value)

	// Test query with multiple results
	people, err = provider.SearchDirectory(workspace.PeopleSearchOptions{
		Query: "example.com",
	})
	require.NoError(t, err)
	assert.Len(t, people, 3, "Should return all users matching domain")

	// Test empty query (should return all users)
	people, err = provider.SearchDirectory(workspace.PeopleSearchOptions{
		Query: "",
	})
	require.NoError(t, err)
	assert.Len(t, people, 3, "Empty query should return all users")

	// Test case-insensitive search
	people, err = provider.SearchDirectory(workspace.PeopleSearchOptions{
		Query: "BROWN",
	})
	require.NoError(t, err)
	assert.Len(t, people, 1)
	assert.Equal(t, "Bob Brown", people[0].Names[0].DisplayName)
}

// TestProviderCompliance_CreateFolder tests CreateFolder method behavior.
func TestProviderCompliance_CreateFolder(t *testing.T) {
	adapter, cleanup := setupTestAdapter(t)
	defer cleanup()

	provider := NewProviderAdapter(adapter)

	t.Run("BasicFolderCreation", func(t *testing.T) {
		folder, err := provider.CreateFolder("New Folder", "")
		require.NoError(t, err)
		assert.NotEmpty(t, folder.Id)
		assert.Equal(t, "New Folder", folder.Name)
		assert.Equal(t, "application/vnd.google-apps.folder", folder.MimeType)
	})

	t.Run("NestedFolderCreation", func(t *testing.T) {
		// Create parent folder
		parent, err := provider.CreateFolder("Parent Folder", "")
		require.NoError(t, err)

		// Create child folder
		child, err := provider.CreateFolder("Child Folder", parent.Id)
		require.NoError(t, err)
		assert.NotEmpty(t, child.Id)
		assert.Equal(t, "Child Folder", child.Name)
		assert.Contains(t, child.Parents, parent.Id)
	})

	t.Run("EmptyFolderName", func(t *testing.T) {
		_, err := provider.CreateFolder("", "")
		assert.Error(t, err, "Should error on empty folder name")
	})
}

// TestProviderCompliance_CreateShortcut tests CreateShortcut method behavior.
func TestProviderCompliance_CreateShortcut(t *testing.T) {
	adapter, cleanup := setupTestAdapter(t)
	defer cleanup()

	provider := NewProviderAdapter(adapter)
	ctx := context.Background()

	// Create target document
	target, err := adapter.DocumentStorage().CreateDocument(ctx, testDocumentCreate("Target Document", ""))
	require.NoError(t, err)

	// Create folder for shortcut
	folder, err := adapter.DocumentStorage().CreateFolder(ctx, "Shortcuts", "")
	require.NoError(t, err)

	// Create shortcut
	shortcut, err := provider.CreateShortcut(target.ID, folder.ID)
	require.NoError(t, err)
	assert.NotEmpty(t, shortcut.Id)
	assert.Equal(t, "application/vnd.google-apps.shortcut", shortcut.MimeType)
	assert.Contains(t, shortcut.Parents, folder.ID)
	assert.Equal(t, target.ID, shortcut.ShortcutDetails.TargetId)
	assert.Equal(t, "application/vnd.google-apps.document", shortcut.ShortcutDetails.TargetMimeType)
}

// TestProviderCompliance_GetDoc tests GetDoc method behavior.
func TestProviderCompliance_GetDoc(t *testing.T) {
	adapter, cleanup := setupTestAdapter(t)
	defer cleanup()

	provider := NewProviderAdapter(adapter)
	ctx := context.Background()

	// Create document with content
	doc, err := adapter.DocumentStorage().CreateDocument(ctx, &workspace.DocumentCreate{
		Name:           "Test Document",
		ParentFolderID: "",
		Owner:          "test@example.com",
		Content:        "# Heading\n\nThis is test content.",
	})
	require.NoError(t, err)

	// Test GetDoc
	gdoc, err := provider.GetDoc(doc.ID)
	require.NoError(t, err)
	assert.Equal(t, doc.ID, gdoc.DocumentId)
	assert.Equal(t, "Test Document", gdoc.Title)
	assert.NotNil(t, gdoc.Body)
	assert.NotEmpty(t, gdoc.Body.Content)

	// Verify content structure
	paragraph := gdoc.Body.Content[0].Paragraph
	assert.NotNil(t, paragraph)
	assert.NotEmpty(t, paragraph.Elements)
	assert.NotNil(t, paragraph.Elements[0].TextRun)
	assert.Contains(t, paragraph.Elements[0].TextRun.Content, "Heading")
}

// TestProviderCompliance_UpdateDoc tests UpdateDoc method behavior.
func TestProviderCompliance_UpdateDoc(t *testing.T) {
	adapter, cleanup := setupTestAdapter(t)
	defer cleanup()

	provider := NewProviderAdapter(adapter)
	ctx := context.Background()

	// Create document
	doc, err := adapter.DocumentStorage().CreateDocument(ctx, testDocumentCreate("Test Document", ""))
	require.NoError(t, err)

	// Test UpdateDoc - should return error as it's not fully implemented
	_, err = provider.UpdateDoc(doc.ID, nil)
	assert.Error(t, err, "UpdateDoc should return not implemented error")
	assert.Contains(t, err.Error(), "not fully implemented")
}

// TestProviderCompliance_RevisionManagement tests revision-related methods.
func TestProviderCompliance_RevisionManagement(t *testing.T) {
	adapter, cleanup := setupTestAdapter(t)
	defer cleanup()

	provider := NewProviderAdapter(adapter)
	ctx := context.Background()

	// Create document
	doc, err := adapter.DocumentStorage().CreateDocument(ctx, testDocumentCreate("Test Document", ""))
	require.NoError(t, err)

	t.Run("GetLatestRevision", func(t *testing.T) {
		revision, err := provider.GetLatestRevision(doc.ID)
		require.NoError(t, err)
		assert.NotEmpty(t, revision.Id)
		assert.NotEmpty(t, revision.ModifiedTime)
		assert.False(t, revision.KeepForever)
	})

	t.Run("KeepRevisionForever", func(t *testing.T) {
		revision, err := provider.KeepRevisionForever(doc.ID, "1")
		require.NoError(t, err)
		assert.Equal(t, "1", revision.Id)
		assert.True(t, revision.KeepForever)
	})

	t.Run("UpdateKeepRevisionForever", func(t *testing.T) {
		err := provider.UpdateKeepRevisionForever(doc.ID, "1", true)
		assert.NoError(t, err, "Should not error even though it's a no-op")

		err = provider.UpdateKeepRevisionForever(doc.ID, "1", false)
		assert.NoError(t, err)
	})
}

// TestProviderCompliance_SendEmail tests SendEmail method behavior.
func TestProviderCompliance_SendEmail(t *testing.T) {
	adapter, cleanup := setupTestAdapter(t)
	defer cleanup()

	provider := NewProviderAdapter(adapter)

	// Test SendEmail delegates to notification service
	err := provider.SendEmail(
		[]string{"recipient@example.com"},
		"sender@example.com",
		"Test Subject",
		"Test body content",
	)
	assert.NoError(t, err)

	// Test with multiple recipients
	err = provider.SendEmail(
		[]string{"user1@example.com", "user2@example.com"},
		"sender@example.com",
		"Multi Recipient Test",
		"Body",
	)
	assert.NoError(t, err)

	// Test with empty recipients - notification service logs but doesn't error
	err = provider.SendEmail(
		[]string{},
		"sender@example.com",
		"No Recipients",
		"Body",
	)
	assert.NoError(t, err, "Empty recipients shouldn't error (just logs)")
}

// TestProviderCompliance_ListGroups tests ListGroups method behavior.
func TestProviderCompliance_ListGroups(t *testing.T) {
	adapter, cleanup := setupTestAdapter(t)
	defer cleanup()

	provider := NewProviderAdapter(adapter)

	// Test ListGroups returns empty array
	groups, err := provider.ListGroups("example.com", "engineering", 10)
	require.NoError(t, err)
	assert.Empty(t, groups, "Local adapter should return empty groups")

	// Test with empty query
	groups, err = provider.ListGroups("example.com", "", 100)
	require.NoError(t, err)
	assert.Empty(t, groups)
}

// TestProviderCompliance_ListUserGroups tests ListUserGroups method behavior.
func TestProviderCompliance_ListUserGroups(t *testing.T) {
	adapter, cleanup := setupTestAdapter(t)
	defer cleanup()

	provider := NewProviderAdapter(adapter)

	// Test ListUserGroups returns empty array
	groups, err := provider.ListUserGroups("user@example.com")
	require.NoError(t, err)
	assert.Empty(t, groups, "Local adapter should return empty groups")
}

// TestProviderCompliance_ShareFileWithDomain tests ShareFileWithDomain method behavior.
func TestProviderCompliance_ShareFileWithDomain(t *testing.T) {
	adapter, cleanup := setupTestAdapter(t)
	defer cleanup()

	provider := NewProviderAdapter(adapter)
	ctx := context.Background()

	// Create document
	doc, err := adapter.DocumentStorage().CreateDocument(ctx, testDocumentCreate("Test Document", ""))
	require.NoError(t, err)

	// Test ShareFileWithDomain is a no-op (should not error)
	err = provider.ShareFileWithDomain(doc.ID, "example.com", "reader")
	assert.NoError(t, err, "ShareFileWithDomain should be no-op for local adapter")

	// Verify no permissions were added
	perms, err := provider.ListPermissions(doc.ID)
	require.NoError(t, err)
	assert.Empty(t, perms, "Domain sharing should not add permissions in local adapter")
}

// TestProviderCompliance_CopyFile_ErrorCases tests CopyFile error scenarios.
func TestProviderCompliance_CopyFile_ErrorCases(t *testing.T) {
	adapter, cleanup := setupTestAdapter(t)
	defer cleanup()

	provider := NewProviderAdapter(adapter)

	t.Run("NonexistentSource", func(t *testing.T) {
		_, err := provider.CopyFile("nonexistent-id", "", "Copy")
		assert.Error(t, err, "Should error on nonexistent source")
	})

	t.Run("EmptyCopyName", func(t *testing.T) {
		ctx := context.Background()
		doc, err := adapter.DocumentStorage().CreateDocument(ctx, testDocumentCreate("Source", ""))
		require.NoError(t, err)

		_, err = provider.CopyFile(doc.ID, "", "")
		assert.Error(t, err, "Should error on empty copy name")
	})
}

// TestProviderCompliance_MoveFile_ErrorCases tests MoveFile error scenarios.
func TestProviderCompliance_MoveFile_ErrorCases(t *testing.T) {
	adapter, cleanup := setupTestAdapter(t)
	defer cleanup()

	provider := NewProviderAdapter(adapter)

	t.Run("NonexistentFile", func(t *testing.T) {
		_, err := provider.MoveFile("nonexistent-id", "")
		assert.Error(t, err, "Should error on nonexistent file")
	})

	t.Run("ValidMove", func(t *testing.T) {
		ctx := context.Background()
		folder, err := adapter.DocumentStorage().CreateFolder(ctx, "Dest", "")
		require.NoError(t, err)

		doc, err := adapter.DocumentStorage().CreateDocument(ctx, testDocumentCreate("Test", ""))
		require.NoError(t, err)

		// Moving to a valid folder should succeed
		moved, err := provider.MoveFile(doc.ID, folder.ID)
		require.NoError(t, err)
		assert.Equal(t, doc.ID, moved.Id)
		assert.Contains(t, moved.Parents, folder.ID)
	})
}

// TestProviderCompliance_ShareFile_EdgeCases tests ShareFile with various scenarios.
func TestProviderCompliance_ShareFile_EdgeCases(t *testing.T) {
	adapter, cleanup := setupTestAdapter(t)
	defer cleanup()

	provider := NewProviderAdapter(adapter)
	ctx := context.Background()

	doc, err := adapter.DocumentStorage().CreateDocument(ctx, testDocumentCreate("Test", ""))
	require.NoError(t, err)

	t.Run("MultipleRoles", func(t *testing.T) {
		// Share with different roles
		err := provider.ShareFile(doc.ID, "user1@example.com", "reader")
		require.NoError(t, err)

		err = provider.ShareFile(doc.ID, "user2@example.com", "writer")
		require.NoError(t, err)

		err = provider.ShareFile(doc.ID, "user3@example.com", "commenter")
		require.NoError(t, err)

		// Verify all permissions exist
		perms, err := provider.ListPermissions(doc.ID)
		require.NoError(t, err)
		assert.Len(t, perms, 3)
	})

	t.Run("DuplicateShare", func(t *testing.T) {
		// Share with same user twice - should update, not duplicate
		err := provider.ShareFile(doc.ID, "duplicate@example.com", "reader")
		require.NoError(t, err)

		err = provider.ShareFile(doc.ID, "duplicate@example.com", "writer")
		require.NoError(t, err)

		// Count permissions for this user
		perms, err := provider.ListPermissions(doc.ID)
		require.NoError(t, err)

		count := 0
		for _, p := range perms {
			if p.EmailAddress == "duplicate@example.com" {
				count++
			}
		}
		assert.LessOrEqual(t, count, 1, "Should not have duplicate permissions for same user")
	})
}

// TestProviderCompliance_GetSubfolder_Nested tests nested folder navigation.
func TestProviderCompliance_GetSubfolder_Nested(t *testing.T) {
	adapter, cleanup := setupTestAdapter(t)
	defer cleanup()

	provider := NewProviderAdapter(adapter)
	ctx := context.Background()

	// Create nested folder structure
	parent, err := adapter.DocumentStorage().CreateFolder(ctx, "Parent", "")
	require.NoError(t, err)

	child, err := adapter.DocumentStorage().CreateFolder(ctx, "Child", parent.ID)
	require.NoError(t, err)

	grandchild, err := adapter.DocumentStorage().CreateFolder(ctx, "Grandchild", child.ID)
	require.NoError(t, err)

	// Test finding at different levels
	foundID, err := provider.GetSubfolder(parent.ID, "Child")
	require.NoError(t, err)
	assert.Equal(t, child.ID, foundID)

	foundID, err = provider.GetSubfolder(child.ID, "Grandchild")
	require.NoError(t, err)
	assert.Equal(t, grandchild.ID, foundID)

	// Test not found
	_, err = provider.GetSubfolder(parent.ID, "Nonexistent")
	assert.Error(t, err, "Should error on nonexistent subfolder")
}

// TestProviderCompliance_CreateShortcut_ErrorCases tests CreateShortcut error handling.
func TestProviderCompliance_CreateShortcut_ErrorCases(t *testing.T) {
	adapter, cleanup := setupTestAdapter(t)
	defer cleanup()

	provider := NewProviderAdapter(adapter)

	t.Run("NonexistentTarget", func(t *testing.T) {
		_, err := provider.CreateShortcut("nonexistent-target", "")
		assert.Error(t, err, "Should error on nonexistent target")
	})
}

// TestProviderCompliance_GetDoc_ErrorCases tests GetDoc error handling.
func TestProviderCompliance_GetDoc_ErrorCases(t *testing.T) {
	adapter, cleanup := setupTestAdapter(t)
	defer cleanup()

	provider := NewProviderAdapter(adapter)

	t.Run("NonexistentDocument", func(t *testing.T) {
		_, err := provider.GetDoc("nonexistent-id")
		assert.Error(t, err, "Should error on nonexistent document")
	})
}

// TestProviderCompliance_GetLatestRevision_ErrorCases tests GetLatestRevision error handling.
func TestProviderCompliance_GetLatestRevision_ErrorCases(t *testing.T) {
	adapter, cleanup := setupTestAdapter(t)
	defer cleanup()

	provider := NewProviderAdapter(adapter)

	t.Run("NonexistentDocument", func(t *testing.T) {
		_, err := provider.GetLatestRevision("nonexistent-id")
		assert.Error(t, err, "Should error on nonexistent document")
	})
}

// TestProviderCompliance_SearchDirectory_MaxResults tests result limiting.
func TestProviderCompliance_SearchDirectory_MaxResults(t *testing.T) {
	adapter, cleanup := setupTestAdapter(t)
	defer cleanup()

	provider := NewProviderAdapter(adapter)

	// Create users.json with 5 users
	usersJSON := `{
		"user1@example.com": {"email": "user1@example.com", "name": "User One", "givenName": "User", "familyName": "One", "isActive": true},
		"user2@example.com": {"email": "user2@example.com", "name": "User Two", "givenName": "User", "familyName": "Two", "isActive": true},
		"user3@example.com": {"email": "user3@example.com", "name": "User Three", "givenName": "User", "familyName": "Three", "isActive": true},
		"user4@example.com": {"email": "user4@example.com", "name": "User Four", "givenName": "User", "familyName": "Four", "isActive": true},
		"user5@example.com": {"email": "user5@example.com", "name": "User Five", "givenName": "User", "familyName": "Five", "isActive": true}
	}`
	err := os.WriteFile(adapter.usersPath, []byte(usersJSON), 0644)
	require.NoError(t, err)

	// Test with max results
	people, err := provider.SearchDirectory(workspace.PeopleSearchOptions{
		Query:      "User",
		MaxResults: 3,
	})
	require.NoError(t, err)
	assert.Len(t, people, 3, "Should limit results to MaxResults")

	// Test without max results
	people, err = provider.SearchDirectory(workspace.PeopleSearchOptions{
		Query: "User",
	})
	require.NoError(t, err)
	assert.Len(t, people, 5, "Should return all matches without MaxResults")
}
