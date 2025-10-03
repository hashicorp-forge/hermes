package storage

import (
	"time"
)

// Document represents a storage-agnostic document.
type Document struct {
	// ID is the unique identifier for the document.
	ID string

	// Name is the document name/title.
	Name string

	// Content is the document content (may be empty if not loaded).
	Content string

	// MimeType is the document MIME type.
	MimeType string

	// ParentFolderID is the parent folder identifier.
	ParentFolderID string

	// CreatedTime is when the document was created.
	CreatedTime time.Time

	// ModifiedTime is when the document was last modified.
	ModifiedTime time.Time

	// Owner is the email of the document owner.
	Owner string

	// Permissions contains document permissions.
	Permissions []Permission

	// ThumbnailURL is the URL to a thumbnail image.
	ThumbnailURL string

	// Metadata contains flexible key-value metadata.
	Metadata map[string]any

	// Trashed indicates if the document is in trash.
	Trashed bool
}

// DocumentCreate contains fields for creating a new document.
type DocumentCreate struct {
	// Name is the document name.
	Name string

	// ParentFolderID is where the document should be created.
	ParentFolderID string

	// TemplateID is an optional document to copy from.
	TemplateID string

	// Content is the initial document content.
	Content string

	// Owner is the document owner email.
	Owner string

	// Metadata contains initial metadata.
	Metadata map[string]any
}

// DocumentUpdate contains fields that can be updated.
type DocumentUpdate struct {
	// Name updates the document name if non-nil.
	Name *string

	// Content updates the document content if non-nil.
	Content *string

	// ParentFolderID moves the document if non-nil.
	ParentFolderID *string

	// Metadata updates metadata fields.
	Metadata map[string]any
}

// Folder represents a storage folder/directory.
type Folder struct {
	// ID is the unique identifier for the folder.
	ID string

	// Name is the folder name.
	Name string

	// ParentID is the parent folder identifier.
	ParentID string

	// CreatedTime is when the folder was created.
	CreatedTime time.Time

	// ModifiedTime is when the folder was last modified.
	ModifiedTime time.Time

	// Metadata contains flexible key-value metadata.
	Metadata map[string]any
}

// Revision represents a document revision/version.
type Revision struct {
	// ID is the unique identifier for the revision.
	ID string

	// DocumentID is the document this revision belongs to.
	DocumentID string

	// ModifiedTime is when this revision was created.
	ModifiedTime time.Time

	// ModifiedBy is the email of who created this revision.
	ModifiedBy string

	// Name is an optional custom name for this revision.
	Name string

	// Content is the content at this revision (may be empty).
	Content string
}

// User represents a user/person.
type User struct {
	// Email is the user's email address.
	Email string

	// Name is the user's full name.
	Name string

	// GivenName is the user's first name.
	GivenName string

	// FamilyName is the user's last name.
	FamilyName string

	// PhotoURL is the URL to the user's profile photo.
	PhotoURL string

	// Metadata contains flexible user metadata.
	Metadata map[string]any
}

// Permission represents a document permission.
type Permission struct {
	// Email is the email of the user/group with this permission.
	Email string

	// Role is the permission role (e.g., "owner", "writer", "reader").
	Role string

	// Type is the permission type (e.g., "user", "group", "domain").
	Type string
}

// AuthInfo contains authentication information.
type AuthInfo struct {
	// Valid indicates if the token is valid.
	Valid bool

	// Email is the authenticated user's email.
	Email string

	// ExpiresAt is when the authentication expires.
	ExpiresAt time.Time
}

// UserInfo contains user information from authentication.
type UserInfo struct {
	// ID is the user's unique identifier.
	ID string

	// Email is the user's email address.
	Email string

	// Name is the user's full name.
	Name string

	// GivenName is the user's first name.
	GivenName string

	// FamilyName is the user's last name.
	FamilyName string

	// Picture is the URL to the user's profile picture.
	Picture string

	// Locale is the user's locale (e.g., "en").
	Locale string

	// HD is the hosted domain (e.g., "hashicorp.com").
	HD string

	// VerifiedEmail indicates if the email is verified.
	VerifiedEmail bool
}
