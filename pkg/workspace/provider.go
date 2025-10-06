// Package workspace provides workspace/storage abstraction for Hermes.
package workspace

import (
	admin "google.golang.org/api/admin/directory/v1"
	"google.golang.org/api/docs/v1"
	"google.golang.org/api/drive/v3"
	"google.golang.org/api/people/v1"
)

// Provider defines the interface for workspace operations (Google Drive, local storage, etc).
// This is a simplified interface focusing on the methods actually used by Hermes handlers.
type Provider interface {
	// File operations
	GetFile(fileID string) (*drive.File, error)
	CopyFile(srcID, destFolderID, name string) (*drive.File, error)
	MoveFile(fileID, destFolderID string) (*drive.File, error)
	DeleteFile(fileID string) error
	RenameFile(fileID, newName string) error
	ShareFile(fileID, email, role string) error
	ShareFileWithDomain(fileID, domain, role string) error
	ListPermissions(fileID string) ([]*drive.Permission, error)
	DeletePermission(fileID, permissionID string) error

	// CreateFileAsUser creates a file by copying a template, impersonating the specified user.
	// This is used when documents should be created with user ownership rather than service account.
	// Returns the created file metadata.
	CreateFileAsUser(templateID, destFolderID, name, userEmail string) (*drive.File, error)

	// People operations
	SearchPeople(email string, fields string) ([]*people.Person, error)

	// Folder operations
	GetSubfolder(parentID, name string) (string, error)
	CreateFolder(name, parentID string) (*drive.File, error)
	CreateShortcut(targetID, parentID string) (*drive.File, error)

	// Document content operations (Google Docs)
	GetDoc(fileID string) (*docs.Document, error)
	UpdateDoc(fileID string, requests []*docs.Request) (*docs.BatchUpdateDocumentResponse, error)

	// Revision management
	GetLatestRevision(fileID string) (*drive.Revision, error)
	KeepRevisionForever(fileID, revisionID string) (*drive.Revision, error)
	UpdateKeepRevisionForever(fileID, revisionID string, keepForever bool) error

	// Email operations
	SendEmail(to []string, from, subject, body string) error

	// Group operations (Google Admin Directory)
	// ListGroups lists groups matching a query in a domain.
	// Returns a slice of groups matching the query.
	ListGroups(domain, query string, maxResults int64) ([]*admin.Group, error)

	// ListUserGroups lists all groups a user is a member of.
	// Returns a slice of groups the user belongs to.
	ListUserGroups(userEmail string) ([]*admin.Group, error)
}
