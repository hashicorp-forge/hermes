// Package storage provides storage abstraction interfaces for document management.
package storage

import (
	"context"
	"time"
)

// DocumentStorage defines the core interface for document operations.
type DocumentStorage interface {
	// GetDocument retrieves a document by ID.
	GetDocument(ctx context.Context, id string) (*Document, error)

	// CreateDocument creates a new document.
	CreateDocument(ctx context.Context, doc *DocumentCreate) (*Document, error)

	// UpdateDocument updates an existing document.
	UpdateDocument(ctx context.Context, id string, updates *DocumentUpdate) (*Document, error)

	// DeleteDocument deletes a document.
	DeleteDocument(ctx context.Context, id string) error

	// ListDocuments lists documents in a folder.
	ListDocuments(ctx context.Context, folderID string, opts *ListOptions) ([]*Document, error)

	// GetDocumentContent retrieves the full content of a document.
	GetDocumentContent(ctx context.Context, id string) (string, error)

	// UpdateDocumentContent updates the content of a document.
	UpdateDocumentContent(ctx context.Context, id string, content string) error

	// ReplaceTextInDocument performs text replacements in a document.
	ReplaceTextInDocument(ctx context.Context, id string, replacements map[string]string) error

	// CopyDocument copies a document to a destination folder.
	CopyDocument(ctx context.Context, sourceID, destFolderID, name string) (*Document, error)

	// MoveDocument moves a document to a destination folder.
	MoveDocument(ctx context.Context, docID, destFolderID string) error

	// CreateFolder creates a new folder.
	CreateFolder(ctx context.Context, name, parentID string) (*Folder, error)

	// GetFolder retrieves folder information.
	GetFolder(ctx context.Context, id string) (*Folder, error)

	// ListFolders lists subfolders in a parent folder.
	ListFolders(ctx context.Context, parentID string) ([]*Folder, error)

	// GetSubfolder gets a subfolder by name within a parent folder.
	GetSubfolder(ctx context.Context, parentID, name string) (*Folder, error)

	// ListRevisions lists document revisions/versions.
	ListRevisions(ctx context.Context, docID string) ([]*Revision, error)

	// GetRevision retrieves a specific revision.
	GetRevision(ctx context.Context, docID, revisionID string) (*Revision, error)

	// GetLatestRevision retrieves the latest revision.
	GetLatestRevision(ctx context.Context, docID string) (*Revision, error)
}

// PeopleService defines user/people operations.
type PeopleService interface {
	// GetUser retrieves user information by email.
	GetUser(ctx context.Context, email string) (*User, error)

	// SearchUsers searches for users matching a query.
	SearchUsers(ctx context.Context, query string, fields []string) ([]*User, error)

	// GetUserPhoto retrieves a user's photo URL.
	GetUserPhoto(ctx context.Context, email string) (string, error)
}

// NotificationService defines email/notification operations.
type NotificationService interface {
	// SendEmail sends a plain text email.
	SendEmail(ctx context.Context, to []string, from, subject, body string) error

	// SendHTMLEmail sends an HTML email.
	SendHTMLEmail(ctx context.Context, to []string, from, subject, htmlBody string) error
}

// AuthService defines authentication operations.
type AuthService interface {
	// ValidateToken validates an authentication token.
	ValidateToken(ctx context.Context, token string) (*AuthInfo, error)

	// GetUserInfo retrieves user information from a token.
	GetUserInfo(ctx context.Context, token string) (*UserInfo, error)
}

// StorageProvider combines all storage-related services.
type StorageProvider interface {
	// DocumentStorage returns the document storage implementation.
	DocumentStorage() DocumentStorage

	// PeopleService returns the people service implementation.
	PeopleService() PeopleService

	// NotificationService returns the notification service implementation.
	NotificationService() NotificationService

	// AuthService returns the auth service implementation.
	AuthService() AuthService
}

// ListOptions contains options for listing documents.
type ListOptions struct {
	// MimeType filters by MIME type (e.g., "application/vnd.google-apps.document").
	MimeType string

	// ModifiedAfter filters documents modified after this time.
	ModifiedAfter *time.Time

	// PageSize limits the number of results.
	PageSize int

	// PageToken is used for pagination.
	PageToken string

	// IncludeTrashed includes trashed/deleted documents if true.
	IncludeTrashed bool
}
