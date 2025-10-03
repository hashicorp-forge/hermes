// Package mock provides a mock workspace adapter for testing.
package mock

import (
	"fmt"
	"time"

	"google.golang.org/api/drive/v3"
	"google.golang.org/api/people/v1"
)

// Adapter is a mock implementation of the workspace.Provider interface.
// It stores files in memory for testing purposes.
type Adapter struct {
	// Files is a map of file IDs to file objects
	Files map[string]*drive.File

	// FileContents is a map of file IDs to file contents
	FileContents map[string]string

	// Permissions is a map of file IDs to their permissions
	Permissions map[string][]*drive.Permission

	// People is a map of email addresses to people objects
	People map[string]*people.Person

	// Folders is a map of parent ID to subfolder names to folder IDs
	Folders map[string]map[string]string
}

// NewAdapter creates a new mock workspace adapter.
func NewAdapter() *Adapter {
	return &Adapter{
		Files:        make(map[string]*drive.File),
		FileContents: make(map[string]string),
		Permissions:  make(map[string][]*drive.Permission),
		People:       make(map[string]*people.Person),
		Folders:      make(map[string]map[string]string),
	}
}

// WithFile adds a file to the mock adapter with the specified ID and metadata.
func (a *Adapter) WithFile(id, name, mimeType string) *Adapter {
	now := time.Now().Format(time.RFC3339)
	a.Files[id] = &drive.File{
		Id:           id,
		Name:         name,
		MimeType:     mimeType,
		CreatedTime:  now,
		ModifiedTime: now,
	}
	return a
}

// WithFileContent adds file content for the specified file ID.
func (a *Adapter) WithFileContent(id, content string) *Adapter {
	a.FileContents[id] = content
	return a
}

// GetFile returns a file by ID from the mock storage.
func (a *Adapter) GetFile(fileID string) (*drive.File, error) {
	file, ok := a.Files[fileID]
	if !ok {
		return nil, fmt.Errorf("file not found: %s", fileID)
	}
	return file, nil
}

// GetFileContent returns the content of a file by ID.
func (a *Adapter) GetFileContent(fileID string) (string, error) {
	content, ok := a.FileContents[fileID]
	if !ok {
		return "", fmt.Errorf("file content not found: %s", fileID)
	}
	return content, nil
}

// ListFiles returns all files in the mock storage.
func (a *Adapter) ListFiles() []*drive.File {
	files := make([]*drive.File, 0, len(a.Files))
	for _, file := range a.Files {
		files = append(files, file)
	}
	return files
}

// CopyFile copies a file to a destination folder with a new name.
func (a *Adapter) CopyFile(srcID, destFolderID, name string) (*drive.File, error) {
	src, ok := a.Files[srcID]
	if !ok {
		return nil, fmt.Errorf("source file not found: %s", srcID)
	}

	// Create a copy
	now := time.Now().Format(time.RFC3339)
	newID := fmt.Sprintf("%s-copy-%d", srcID, time.Now().UnixNano())
	copied := &drive.File{
		Id:           newID,
		Name:         name,
		MimeType:     src.MimeType,
		Parents:      []string{destFolderID},
		CreatedTime:  now,
		ModifiedTime: now,
	}
	a.Files[newID] = copied

	// Copy content if exists
	if content, ok := a.FileContents[srcID]; ok {
		a.FileContents[newID] = content
	}

	return copied, nil
}

// MoveFile moves a file to a destination folder.
func (a *Adapter) MoveFile(fileID, destFolderID string) (*drive.File, error) {
	file, ok := a.Files[fileID]
	if !ok {
		return nil, fmt.Errorf("file not found: %s", fileID)
	}

	file.Parents = []string{destFolderID}
	return file, nil
}

// DeleteFile deletes a file from storage.
func (a *Adapter) DeleteFile(fileID string) error {
	if _, ok := a.Files[fileID]; !ok {
		return fmt.Errorf("file not found: %s", fileID)
	}

	delete(a.Files, fileID)
	delete(a.FileContents, fileID)
	delete(a.Permissions, fileID)
	return nil
}

// RenameFile renames a file.
func (a *Adapter) RenameFile(fileID, newName string) error {
	file, ok := a.Files[fileID]
	if !ok {
		return fmt.Errorf("file not found: %s", fileID)
	}

	file.Name = newName
	file.ModifiedTime = time.Now().Format(time.RFC3339)
	return nil
}

// ShareFile shares a file with a user by granting permissions.
func (a *Adapter) ShareFile(fileID, email, role string) error {
	if _, ok := a.Files[fileID]; !ok {
		return fmt.Errorf("file not found: %s", fileID)
	}

	if a.Permissions[fileID] == nil {
		a.Permissions[fileID] = make([]*drive.Permission, 0)
	}

	// Check if permission already exists
	for _, perm := range a.Permissions[fileID] {
		if perm.EmailAddress == email {
			// Update existing permission
			perm.Role = role
			return nil
		}
	}

	// Add new permission
	perm := &drive.Permission{
		Id:           fmt.Sprintf("perm-%d", time.Now().UnixNano()),
		EmailAddress: email,
		Role:         role,
		Type:         "user",
	}
	a.Permissions[fileID] = append(a.Permissions[fileID], perm)
	return nil
}

// ListPermissions lists all permissions for a file.
func (a *Adapter) ListPermissions(fileID string) ([]*drive.Permission, error) {
	if _, ok := a.Files[fileID]; !ok {
		return nil, fmt.Errorf("file not found: %s", fileID)
	}

	perms := a.Permissions[fileID]
	if perms == nil {
		return []*drive.Permission{}, nil
	}

	return perms, nil
}

// DeletePermission deletes a specific permission from a file.
func (a *Adapter) DeletePermission(fileID, permissionID string) error {
	if _, ok := a.Files[fileID]; !ok {
		return fmt.Errorf("file not found: %s", fileID)
	}

	perms := a.Permissions[fileID]
	for i, perm := range perms {
		if perm.Id == permissionID {
			// Remove permission
			a.Permissions[fileID] = append(perms[:i], perms[i+1:]...)
			return nil
		}
	}

	return fmt.Errorf("permission not found: %s", permissionID)
}

// SearchPeople searches for people by email.
func (a *Adapter) SearchPeople(email string, fields string) ([]*people.Person, error) {
	person, ok := a.People[email]
	if !ok {
		// Return empty list if not found
		return []*people.Person{}, nil
	}

	return []*people.Person{person}, nil
}

// GetSubfolder retrieves a subfolder ID by name within a parent folder.
func (a *Adapter) GetSubfolder(parentID, name string) (string, error) {
	subfolders, ok := a.Folders[parentID]
	if !ok {
		return "", fmt.Errorf("parent folder not found: %s", parentID)
	}

	folderID, ok := subfolders[name]
	if !ok {
		return "", fmt.Errorf("subfolder not found: %s in parent %s", name, parentID)
	}

	return folderID, nil
}

// WithPerson adds a person to the mock adapter for SearchPeople operations.
func (a *Adapter) WithPerson(email, displayName, photoURL string) *Adapter {
	a.People[email] = &people.Person{
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
	return a
}

// WithSubfolder adds a subfolder mapping to the mock adapter.
func (a *Adapter) WithSubfolder(parentID, name, folderID string) *Adapter {
	if a.Folders[parentID] == nil {
		a.Folders[parentID] = make(map[string]string)
	}
	a.Folders[parentID][name] = folderID
	return a
}
