package models

import (
	"fmt"
	"time"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// DocumentFileRevision is a model for a document's Google Drive file revisions.
type DocumentFileRevision struct {
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`

	Document   Document
	DocumentID uint `gorm:"primaryKey"`

	// FileRevisionID is the universal ID for the file revision (SharePoint or Google Drive).
	FileRevisionID string `gorm:"primaryKey"`

	// Name is the name of the document file revision.
	Name string `gorm:"primaryKey"`

	// GoogleDriveFileRevisionID is the legacy Google Drive revision ID.
	// RETAINED FOR MIGRATION: Existing Google-deployed databases have rows keyed
	// by this column. It is preserved as a nullable field so that:
	//   1. Existing data is not lost during the schema migration (GORM AutoMigrate
	//      adds the new FileRevisionID column; the old column stays).
	//   2. Rollback to a pre-merge version is possible without data loss.
	//   3. Migration scripts can copy GoogleDriveFileRevisionID → FileRevisionID
	//      for existing rows, then this column can be dropped in a future release.
	// New code should read/write FileRevisionID exclusively.
	GoogleDriveFileRevisionID *string `gorm:"default:null"`
}

// DocumentFileRevisions is a slice of document file revisions.
type DocumentFileRevisions []DocumentFileRevision

// Create creates a file revision for a document.
// Required fields in the receiver:
//   - Document ID or Google File ID
//   - Google Drive file revision ID
//   - Name of file revision
func (fr *DocumentFileRevision) Create(db *gorm.DB) error {
	// Preload Document.
	if fr.DocumentID == 0 {
		if err := fr.Document.Get(db); err != nil {
			return fmt.Errorf("error preloading Document: %w", err)
		}
		fr.DocumentID = fr.Document.ID
	}

	// Validate fields.
	if err := validation.ValidateStruct(fr,
		validation.Field(&fr.DocumentID, validation.Required),
		validation.Field(&fr.FileRevisionID, validation.Required),
		validation.Field(&fr.Name, validation.Required),
	); err != nil {
		return err
	}

	return db.
		Omit("Document").
		Create(&fr).
		Error
}

// Find finds all file revisions for a provided document, and assigns them to
// the receiver.
func (frs *DocumentFileRevisions) Find(db *gorm.DB, doc Document) error {
	// Preload Document.
	if doc.ID == 0 {
		if err := doc.Get(db); err != nil {
			return fmt.Errorf("error preloading document: %w", err)
		}
	}

	// Validate fields.
	if err := validation.ValidateStruct(&doc,
		validation.Field(&doc.ID, validation.Required),
	); err != nil {
		return err
	}

	return db.
		Where(DocumentFileRevision{
			DocumentID: doc.ID,
		}).
		Preload(clause.Associations).
		Find(&frs).
		Error
}

func (fr *DocumentFileRevision) Get(db *gorm.DB) error {
	// Preload Document.
	if fr.DocumentID == 0 {
		if err := fr.Document.Get(db); err != nil {
			return fmt.Errorf("error preloading Document: %w", err)
		}
		fr.DocumentID = fr.Document.ID
	}

	// Validate fields.
	if err := validation.ValidateStruct(fr,
		validation.Field(&fr.DocumentID, validation.Required),
		validation.Field(&fr.FileRevisionID, validation.Required),
		validation.Field(&fr.Name, validation.Required),
	); err != nil {
		return err
	}

	return db.
		Preload(clause.Associations).
		First(&fr).
		Error
}
