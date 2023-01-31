package models

import (
	"fmt"
	"time"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type DocumentCustomField struct {
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`

	DocumentID                uint `gorm:"primaryKey"`
	DocumentTypeCustomFieldID uint `gorm:"primaryKey"`
	DocumentTypeCustomField   DocumentTypeCustomField
	// Value                     datatypes.JSON
	Value string
}

// BeforeSave is a hook to find or create associations before saving.
func (d *DocumentCustomField) BeforeSave(tx *gorm.DB) error {
	// Validate required fields.
	if err := validation.ValidateStruct(&d.DocumentTypeCustomField,
		validation.Field(
			&d.DocumentTypeCustomField.Name, validation.Required),
	); err != nil {
		return err
	}
	if err := validation.ValidateStruct(&d.DocumentTypeCustomField.DocumentType,
		validation.Field(
			&d.DocumentTypeCustomField.DocumentType.Name, validation.Required),
	); err != nil {
		return err
	}

	// Get document type custom field.
	// dt := d.DocumentTypeCustomField.DocumentType
	if err := d.DocumentTypeCustomField.Get(tx); err != nil {
		return fmt.Errorf("error getting document type custom field: %w", err)
	}
	// d.DocumentType = dt
	d.DocumentTypeCustomFieldID = d.DocumentTypeCustomField.DocumentType.ID

	return nil
}

// FirstOrCreate finds the first user by email address or creates a user record
// if it does not exist in database db. The result is saved back to the
// receiver.
// TODO: not upsert.
func (d *DocumentCustomField) Upsert(db *gorm.DB) error {
	return db.
		Where(DocumentCustomField{
			DocumentID:                d.DocumentID,
			DocumentTypeCustomFieldID: d.DocumentTypeCustomFieldID,
		}).
		Preload(clause.Associations).
		FirstOrCreate(&d).Error
}
