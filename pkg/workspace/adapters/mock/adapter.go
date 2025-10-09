// Package mock provides a mock workspace adapter for testing.
package mock

import (
	"fmt"
	"time"

	"github.com/hashicorp-forge/hermes/pkg/workspace"
	admin "google.golang.org/api/admin/directory/v1"
	"google.golang.org/api/docs/v1"
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

	// Documents is a map of file IDs to Google Docs documents
	Documents map[string]*docs.Document

	// Revisions is a map of file IDs to their revisions
	Revisions map[string][]*drive.Revision

	// Groups is a map of group keys to groups (for admin directory operations)
	Groups map[string]*admin.Group

	// UserGroups is a map of user emails to their groups
	UserGroups map[string][]*admin.Group

	// EmailsSent tracks emails that were sent (for testing)
	EmailsSent []struct {
		To      []string
		From    string
		Subject string
		Body    string
	}
}

// NewAdapter creates a new mock workspace adapter.
func NewAdapter() *Adapter {
	return &Adapter{
		Files:        make(map[string]*drive.File),
		FileContents: make(map[string]string),
		Permissions:  make(map[string][]*drive.Permission),
		People:       make(map[string]*people.Person),
		Folders:      make(map[string]map[string]string),
		Documents:    make(map[string]*docs.Document),
		Revisions:    make(map[string][]*drive.Revision),
		Groups:       make(map[string]*admin.Group),
		UserGroups:   make(map[string][]*admin.Group),
		EmailsSent: make([]struct {
			To      []string
			From    string
			Subject string
			Body    string
		}, 0),
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

	// Copy document if exists (for Google Docs)
	if srcDoc, ok := a.Documents[srcID]; ok {
		// Create a deep copy of the document with the new ID
		copiedDoc := &docs.Document{
			DocumentId: newID,
			Title:      name,
			Body:       srcDoc.Body, // Shallow copy of body structure
		}
		a.Documents[newID] = copiedDoc
	}

	return copied, nil
}

// CreateFileAsUser creates a file by copying a template, simulating user impersonation.
// In the mock implementation, this behaves the same as CopyFile but is provided
// for interface completeness.
func (a *Adapter) CreateFileAsUser(templateID, destFolderID, name, userEmail string) (*drive.File, error) {
	// For mock purposes, we just call CopyFile
	// In a real implementation, this would track that the file was created as the user
	file, err := a.CopyFile(templateID, destFolderID, name)
	if err != nil {
		return nil, err
	}

	// Optionally, we could store metadata indicating this was created as a specific user
	// For now, just return the file
	return file, nil
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

// ShareFileWithDomain shares a file with an entire domain by granting permissions.
func (a *Adapter) ShareFileWithDomain(fileID, domain, role string) error {
	if _, ok := a.Files[fileID]; !ok {
		return fmt.Errorf("file not found: %s", fileID)
	}

	if a.Permissions[fileID] == nil {
		a.Permissions[fileID] = make([]*drive.Permission, 0)
	}

	// Check if domain permission already exists
	for _, perm := range a.Permissions[fileID] {
		if perm.Domain == domain && perm.Type == "domain" {
			// Update existing permission
			perm.Role = role
			return nil
		}
	}

	// Add new domain permission
	perm := &drive.Permission{
		Id:     fmt.Sprintf("perm-%d", time.Now().UnixNano()),
		Domain: domain,
		Role:   role,
		Type:   "domain",
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

// SearchDirectory performs advanced directory search with query strings and filters.
// For the mock adapter, this searches people by matching the query against names and emails.
func (a *Adapter) SearchDirectory(opts workspace.PeopleSearchOptions) ([]*people.Person, error) {
	// Simple implementation: return all people if query is empty, otherwise filter by query
	results := []*people.Person{}

	for _, person := range a.People {
		// If query is empty, include all
		if opts.Query == "" {
			results = append(results, person)
			continue
		}

		// Otherwise, search in names and emails
		match := false

		// Check email addresses
		for _, email := range person.EmailAddresses {
			if email.Value == opts.Query {
				match = true
				break
			}
		}

		// Check names
		if !match && len(person.Names) > 0 {
			for _, name := range person.Names {
				if name.DisplayName == opts.Query || name.GivenName == opts.Query || name.FamilyName == opts.Query {
					match = true
					break
				}
			}
		}

		if match {
			results = append(results, person)
		}
	}

	// Apply max results limit if specified
	if opts.MaxResults > 0 && int64(len(results)) > opts.MaxResults {
		results = results[:opts.MaxResults]
	}

	return results, nil
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

func (a *Adapter) CreateFolder(name, parentID string) (*drive.File, error) {
	folderID := fmt.Sprintf("folder-%s-%d", name, len(a.Files))
	file := &drive.File{
		Id:       folderID,
		Name:     name,
		MimeType: "application/vnd.google-apps.folder",
		Parents:  []string{parentID},
	}
	a.Files[folderID] = file

	// Add to folders map for GetSubfolder
	if a.Folders[parentID] == nil {
		a.Folders[parentID] = make(map[string]string)
	}
	a.Folders[parentID][name] = folderID

	return file, nil
}

func (a *Adapter) CreateShortcut(targetID, parentID string) (*drive.File, error) {
	shortcutID := fmt.Sprintf("shortcut-%s-%d", targetID, len(a.Files))
	file := &drive.File{
		Id:       shortcutID,
		Name:     fmt.Sprintf("Shortcut to %s", targetID),
		MimeType: "application/vnd.google-apps.shortcut",
		Parents:  []string{parentID},
		ShortcutDetails: &drive.FileShortcutDetails{
			TargetId: targetID,
		},
	}
	a.Files[shortcutID] = file
	return file, nil
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

// Document content operations

// GetDoc retrieves a Google Docs document by file ID.
func (a *Adapter) GetDoc(fileID string) (*docs.Document, error) {
	doc, ok := a.Documents[fileID]
	if !ok {
		return nil, fmt.Errorf("document not found: %s", fileID)
	}
	return doc, nil
}

// UpdateDoc applies batch updates to a Google Docs document.
func (a *Adapter) UpdateDoc(fileID string, requests []*docs.Request) (*docs.BatchUpdateDocumentResponse, error) {
	if _, ok := a.Documents[fileID]; !ok {
		return nil, fmt.Errorf("document not found: %s", fileID)
	}

	// Mock implementation - just return success
	// In a real implementation, would apply the requests to the document
	return &docs.BatchUpdateDocumentResponse{
		DocumentId: fileID,
		Replies:    make([]*docs.Response, len(requests)),
	}, nil
}

// WithDocument adds a Google Docs document to the mock adapter.
func (a *Adapter) WithDocument(fileID string, doc *docs.Document) *Adapter {
	a.Documents[fileID] = doc
	return a
}

// Revision management

// GetLatestRevision returns the latest revision for a file.
func (a *Adapter) GetLatestRevision(fileID string) (*drive.Revision, error) {
	revisions, ok := a.Revisions[fileID]
	if !ok || len(revisions) == 0 {
		return nil, fmt.Errorf("no revisions found for file: %s", fileID)
	}

	// Return the last revision
	return revisions[len(revisions)-1], nil
}

// KeepRevisionForever marks a revision to be kept forever.
func (a *Adapter) KeepRevisionForever(fileID, revisionID string) (*drive.Revision, error) {
	revisions, ok := a.Revisions[fileID]
	if !ok {
		return nil, fmt.Errorf("no revisions found for file: %s", fileID)
	}

	for _, rev := range revisions {
		if rev.Id == revisionID {
			rev.KeepForever = true
			return rev, nil
		}
	}

	return nil, fmt.Errorf("revision not found: %s", revisionID)
}

// UpdateKeepRevisionForever updates the keep forever status of a revision.
func (a *Adapter) UpdateKeepRevisionForever(fileID, revisionID string, keepForever bool) error {
	revisions, ok := a.Revisions[fileID]
	if !ok {
		return fmt.Errorf("no revisions found for file: %s", fileID)
	}

	for _, rev := range revisions {
		if rev.Id == revisionID {
			rev.KeepForever = keepForever
			return nil
		}
	}

	return fmt.Errorf("revision not found: %s", revisionID)
}

// WithRevision adds a revision to the mock adapter.
func (a *Adapter) WithRevision(fileID, revisionID string, keepForever bool) *Adapter {
	if a.Revisions[fileID] == nil {
		a.Revisions[fileID] = make([]*drive.Revision, 0)
	}

	rev := &drive.Revision{
		Id:           revisionID,
		KeepForever:  keepForever,
		ModifiedTime: time.Now().Format(time.RFC3339),
	}

	a.Revisions[fileID] = append(a.Revisions[fileID], rev)
	return a
}

// Email operations

// SendEmail sends an email (mocked - just records it).
func (a *Adapter) SendEmail(to []string, from, subject, body string) error {
	a.EmailsSent = append(a.EmailsSent, struct {
		To      []string
		From    string
		Subject string
		Body    string
	}{
		To:      to,
		From:    from,
		Subject: subject,
		Body:    body,
	})
	return nil
}

// Group operations

// ListGroups lists groups matching a query in a domain.
func (a *Adapter) ListGroups(domain, query string, maxResults int64) ([]*admin.Group, error) {
	groups := make([]*admin.Group, 0)
	for _, group := range a.Groups {
		// Simple matching - in real implementation would filter by query
		if query == "" || group.Name == query || group.Email == query {
			groups = append(groups, group)
			if maxResults > 0 && int64(len(groups)) >= maxResults {
				break
			}
		}
	}
	return groups, nil
}

// ListUserGroups lists all groups a user is a member of.
func (a *Adapter) ListUserGroups(userEmail string) ([]*admin.Group, error) {
	groups, ok := a.UserGroups[userEmail]
	if !ok {
		return []*admin.Group{}, nil
	}
	return groups, nil
}

// WithGroup adds a group to the mock adapter.
func (a *Adapter) WithGroup(id, email, name string) *Adapter {
	a.Groups[id] = &admin.Group{
		Id:    id,
		Email: email,
		Name:  name,
	}
	return a
}

// WithUserGroup adds a user to a group in the mock adapter.
func (a *Adapter) WithUserGroup(userEmail string, group *admin.Group) *Adapter {
	if a.UserGroups[userEmail] == nil {
		a.UserGroups[userEmail] = make([]*admin.Group, 0)
	}
	a.UserGroups[userEmail] = append(a.UserGroups[userEmail], group)
	return a
}

// SupportsContentEditing returns true as the mock adapter can support content editing for testing.
func (a *Adapter) SupportsContentEditing() bool {
	return true
}
