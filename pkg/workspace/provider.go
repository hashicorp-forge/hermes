// Package workspace provides workspace/storage abstraction for Hermes.
package workspace

import (
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
	ListPermissions(fileID string) ([]*drive.Permission, error)
	DeletePermission(fileID, permissionID string) error

	// People operations
	SearchPeople(email string, fields string) ([]*people.Person, error)

	// Folder operations
	GetSubfolder(parentID, name string) (string, error)
}
