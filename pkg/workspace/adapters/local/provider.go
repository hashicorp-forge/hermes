package local

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/hashicorp-forge/hermes/pkg/workspace"
	"google.golang.org/api/drive/v3"
	"google.golang.org/api/people/v1"
)

// ProviderAdapter adapts the local Adapter (which implements StorageProvider)
// to the workspace.Provider interface used by API handlers.
// This bridges the gap between the comprehensive StorageProvider and the
// simplified Provider interface focused on Drive-like operations.
type ProviderAdapter struct {
	adapter *Adapter
	ctx     context.Context
}

// NewProviderAdapter creates a Provider interface wrapper around a local Adapter.
func NewProviderAdapter(adapter *Adapter) *ProviderAdapter {
	return &ProviderAdapter{
		adapter: adapter,
		ctx:     context.Background(),
	}
}

// NewProviderAdapterWithContext creates a Provider interface wrapper with a specific context.
func NewProviderAdapterWithContext(adapter *Adapter, ctx context.Context) *ProviderAdapter {
	return &ProviderAdapter{
		adapter: adapter,
		ctx:     ctx,
	}
}

// GetFile retrieves a file by ID and converts it to Google Drive format.
func (p *ProviderAdapter) GetFile(fileID string) (*drive.File, error) {
	doc, err := p.adapter.DocumentStorage().GetDocument(p.ctx, fileID)
	if err != nil {
		return nil, err
	}

	// Load permissions from metadata
	p.loadPermissionsFromMetadata(doc)

	return documentToDriveFile(doc), nil
}

// CopyFile copies a file to a destination folder with a new name.
func (p *ProviderAdapter) CopyFile(srcID, destFolderID, name string) (*drive.File, error) {
	// Copy the document using the correct signature
	newDoc, err := p.adapter.DocumentStorage().CopyDocument(p.ctx, srcID, destFolderID, name)
	if err != nil {
		return nil, fmt.Errorf("failed to copy document: %w", err)
	}

	return documentToDriveFile(newDoc), nil
}

// MoveFile moves a file to a different folder.
func (p *ProviderAdapter) MoveFile(fileID, destFolderID string) (*drive.File, error) {
	err := p.adapter.DocumentStorage().MoveDocument(p.ctx, fileID, destFolderID)
	if err != nil {
		return nil, fmt.Errorf("failed to move document: %w", err)
	}

	// Get the updated document to return
	doc, err := p.adapter.DocumentStorage().GetDocument(p.ctx, fileID)
	if err != nil {
		return nil, fmt.Errorf("failed to get moved document: %w", err)
	}

	return documentToDriveFile(doc), nil
}

// DeleteFile deletes a file by ID.
func (p *ProviderAdapter) DeleteFile(fileID string) error {
	return p.adapter.DocumentStorage().DeleteDocument(p.ctx, fileID)
}

// RenameFile renames a file.
func (p *ProviderAdapter) RenameFile(fileID, newName string) error {
	_, err := p.adapter.DocumentStorage().UpdateDocument(p.ctx, fileID, &workspace.DocumentUpdate{
		Name: &newName,
	})
	return err
}

// ShareFile shares a file with a user by adding permissions.
// Permissions are stored in the document's metadata as they would be
// in Google Drive's permission system.
func (p *ProviderAdapter) ShareFile(fileID, email, role string) error {
	// Get current document
	doc, err := p.adapter.DocumentStorage().GetDocument(p.ctx, fileID)
	if err != nil {
		return fmt.Errorf("failed to get document: %w", err)
	}

	// Load existing permissions from metadata
	p.loadPermissionsFromMetadata(doc)

	// Check if permission already exists
	for i, perm := range doc.Permissions {
		if perm.Email == email {
			// Update existing permission
			doc.Permissions[i].Role = role
			return p.updatePermissions(fileID, doc.Permissions)
		}
	}

	// Add new permission
	newPerm := workspace.Permission{
		Email: email,
		Role:  role,
		Type:  "user",
	}

	doc.Permissions = append(doc.Permissions, newPerm)
	return p.updatePermissions(fileID, doc.Permissions)
}

// ListPermissions lists all permissions for a file.
func (p *ProviderAdapter) ListPermissions(fileID string) ([]*drive.Permission, error) {
	doc, err := p.adapter.DocumentStorage().GetDocument(p.ctx, fileID)
	if err != nil {
		return nil, fmt.Errorf("failed to get document: %w", err)
	}

	// Load permissions from metadata
	p.loadPermissionsFromMetadata(doc)

	perms := make([]*drive.Permission, len(doc.Permissions))
	for i, perm := range doc.Permissions {
		perms[i] = &drive.Permission{
			Id:           generatePermissionIDForEmail(perm.Email),
			Type:         perm.Type,
			EmailAddress: perm.Email,
			Role:         perm.Role,
		}
	}

	return perms, nil
}

// DeletePermission removes a specific permission from a file.
func (p *ProviderAdapter) DeletePermission(fileID, permissionID string) error {
	doc, err := p.adapter.DocumentStorage().GetDocument(p.ctx, fileID)
	if err != nil {
		return fmt.Errorf("failed to get document: %w", err)
	}

	// Load existing permissions from metadata
	p.loadPermissionsFromMetadata(doc)

	// Filter out the permission to delete
	// The permission ID is based on the email, so we need to find by ID
	newPerms := make([]workspace.Permission, 0, len(doc.Permissions))
	found := false
	for _, perm := range doc.Permissions {
		permID := generatePermissionIDForEmail(perm.Email)
		if permID == permissionID {
			found = true
			continue
		}
		newPerms = append(newPerms, perm)
	}

	if !found {
		return fmt.Errorf("permission not found: %s", permissionID)
	}

	return p.updatePermissions(fileID, newPerms)
}

// SearchPeople searches for people by email in the local people directory.
func (p *ProviderAdapter) SearchPeople(email string, fields string) ([]*people.Person, error) {
	// SearchUsers expects a query and fields slice
	users, err := p.adapter.PeopleService().SearchUsers(p.ctx, email, []string{"names", "emailAddresses", "photos"})
	if err != nil {
		return nil, err
	}

	if len(users) == 0 {
		return []*people.Person{}, nil
	}

	// Convert workspace users to people.Person format
	persons := make([]*people.Person, len(users))
	for i, user := range users {
		person := &people.Person{
			ResourceName: fmt.Sprintf("people/%s", user.Email),
			Etag:         user.Email,
		}

		// Add name if available
		if user.Name != "" {
			person.Names = []*people.Name{
				{
					DisplayName: user.Name,
					GivenName:   user.GivenName,
					FamilyName:  user.FamilyName,
				},
			}
		}

		// Add email
		person.EmailAddresses = []*people.EmailAddress{
			{
				Value: user.Email,
				Type:  "work",
			},
		}

		// Add photo if available
		if user.PhotoURL != "" {
			person.Photos = []*people.Photo{
				{
					Url: user.PhotoURL,
				},
			}
		}

		persons[i] = person
	}

	return persons, nil
}

// SearchDirectory performs advanced directory search with query strings and filters.
// For the local adapter, this performs a simple text search across user names and emails.
func (p *ProviderAdapter) SearchDirectory(opts workspace.PeopleSearchOptions) ([]*people.Person, error) {
	// For local adapter, we treat Query as a search term across names and emails
	users, err := p.adapter.PeopleService().SearchUsers(p.ctx, opts.Query, []string{"names", "emailAddresses", "photos"})
	if err != nil {
		return nil, err
	}

	if len(users) == 0 {
		return []*people.Person{}, nil
	}

	// Apply max results limit if specified
	if opts.MaxResults > 0 && int64(len(users)) > opts.MaxResults {
		users = users[:opts.MaxResults]
	}

	// Convert workspace users to people.Person format
	persons := make([]*people.Person, len(users))
	for i, user := range users {
		person := &people.Person{
			ResourceName: fmt.Sprintf("people/%s", user.Email),
			Etag:         user.Email,
		}

		// Add name if available
		if user.Name != "" {
			person.Names = []*people.Name{
				{
					DisplayName: user.Name,
					GivenName:   user.GivenName,
					FamilyName:  user.FamilyName,
				},
			}
		}

		// Add email
		person.EmailAddresses = []*people.EmailAddress{
			{
				Value: user.Email,
				Type:  "work",
			},
		}

		// Add photo if available
		if user.PhotoURL != "" {
			person.Photos = []*people.Photo{
				{
					Url: user.PhotoURL,
				},
			}
		}

		persons[i] = person
	}

	return persons, nil
}

// GetSubfolder finds a subfolder by name within a parent folder.
func (p *ProviderAdapter) GetSubfolder(parentID, name string) (string, error) {
	folder, err := p.adapter.DocumentStorage().GetSubfolder(p.ctx, parentID, name)
	if err != nil {
		return "", err
	}
	if folder == nil {
		return "", fmt.Errorf("subfolder not found: %s/%s", parentID, name)
	}
	return folder.ID, nil
}

// documentToDriveFile converts a workspace.Document to a drive.File.
func documentToDriveFile(doc *workspace.Document) *drive.File {
	file := &drive.File{
		Id:           doc.ID,
		Name:         doc.Name,
		MimeType:     doc.MimeType,
		CreatedTime:  doc.CreatedTime.Format(time.RFC3339),
		ModifiedTime: doc.ModifiedTime.Format(time.RFC3339),
	}

	if doc.ParentFolderID != "" {
		file.Parents = []string{doc.ParentFolderID}
	}

	if doc.Owner != "" {
		file.Owners = []*drive.User{
			{EmailAddress: doc.Owner},
		}
	}

	if doc.ThumbnailURL != "" {
		file.ThumbnailLink = doc.ThumbnailURL
	}

	return file
}

// updatePermissions updates the permissions for a document.
func (p *ProviderAdapter) updatePermissions(fileID string, permissions []workspace.Permission) error {
	// Get current document to preserve other fields
	doc, err := p.adapter.DocumentStorage().GetDocument(p.ctx, fileID)
	if err != nil {
		return fmt.Errorf("failed to get document: %w", err)
	}

	// Convert permissions to JSON string for storage
	// This is necessary because the YAML frontmatter parser doesn't handle complex types well
	permJSON, err := json.Marshal(permissions)
	if err != nil {
		return fmt.Errorf("failed to marshal permissions: %w", err)
	}

	// Update permissions in metadata as JSON string
	if doc.Metadata == nil {
		doc.Metadata = make(map[string]any)
	}
	doc.Metadata["permissions_json"] = string(permJSON)

	// Update the document
	_, err = p.adapter.DocumentStorage().UpdateDocument(p.ctx, fileID, &workspace.DocumentUpdate{
		Metadata: doc.Metadata,
	})
	if err != nil {
		return fmt.Errorf("failed to update document metadata: %w", err)
	}

	return nil
}

// generatePermissionIDForEmail generates a consistent permission ID based on email.
// This allows us to map between Permission (which has Email) and drive.Permission (which has Id).
func generatePermissionIDForEmail(email string) string {
	// Use a simple hash of the email for consistency
	return fmt.Sprintf("perm-%s", email)
}

// loadPermissionsFromMetadata extracts permissions from document metadata.
// Permissions are stored in metadata["permissions_json"] as a JSON string.
func (p *ProviderAdapter) loadPermissionsFromMetadata(doc *workspace.Document) {
	if doc.Metadata == nil {
		return
	}

	permJSON, ok := doc.Metadata["permissions_json"].(string)
	if !ok || permJSON == "" {
		return
	}

	var permissions []workspace.Permission
	if err := json.Unmarshal([]byte(permJSON), &permissions); err != nil {
		// Log error but don't fail - just return empty permissions
		return
	}

	doc.Permissions = permissions
}
