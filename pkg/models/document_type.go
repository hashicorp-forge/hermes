package models

import (
	"fmt"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"gorm.io/datatypes"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// DocumentType is a model for a type of document (e.g., "RFC", "PRD").
type DocumentType struct {
	gorm.Model

	// Name is the name of the document type, generally an abbreviation.
	// Example: "RFC"
	Name string `gorm:"index;not null;unique"`


	// Description is the description of the document type.
	// Example: "Create a Request for Comments document to present a proposal to
	// colleagues for their review and feedback."
	Description string

	// MoreInfoLinkText is the text for a "more info" link.
	// Example: "When should I create an RFC?"
	MoreInfoLinkText string

	// MoreInfoLinkURL is the URL for a "more info" link.
	MoreInfoLinkURL string

	// CustomFields contain custom fields that are specific to a particular
	// document type.
	CustomFields []DocumentTypeCustomField

	// Checks are document type checks, which require acknowledging a check box in
	// order to publish a document.
	Checks datatypes.JSON
}

// DocumentTypes is a slice of document types.
type DocumentTypes []DocumentType

// FirstOrCreate finds the first document type by name or creates a new record
// if it does not exist.
func (d *DocumentType) FirstOrCreate(db *gorm.DB) error {
	return db.
		Where(DocumentType{Name: d.Name}).
		FirstOrCreate(&d).
		Error
}

// Get gets a document type from database db by document type name, and assigns
// it to the receiver.
func (d *DocumentType) Get(db *gorm.DB) error {
	return db.
		Where(DocumentType{Name: d.Name}).
		Preload(clause.Associations).
		First(&d).
		Error
}

// GetAll gets all document types from database db, and assigns them to the
// receiver.
func (d *DocumentTypes) GetAll(db *gorm.DB) error {
	return db.Find(&d).
		Error
}

// Upsert updates or inserts the receiver into database db.
func (d *DocumentType) Upsert(db *gorm.DB) error {
	if err := validation.ValidateStruct(d,
		validation.Field(&d.Name, validation.Required),
	); err != nil {
		return err
	}

	return db.Transaction(func(tx *gorm.DB) error {
		if err := tx.
			Where(DocumentType{
				Name: d.Name,
			}).
			Omit(clause.Associations).
			Assign(*d).
			FirstOrCreate(&d).
			Error; err != nil {
			return err
		}

		if err := d.upsertAssocations(tx); err != nil {
			return fmt.Errorf("error upserting associations: %w", err)
		}

		if err := d.Get(tx); err != nil {
			return fmt.Errorf("error getting the record after upsert: %w", err)
		}

		return nil
	})
}

// upsertAssocations creates required assocations.
func (d *DocumentType) upsertAssocations(db *gorm.DB) error {
	// Custom fields.
	var customFields []DocumentTypeCustomField
	for _, c := range d.CustomFields {
		// Make sure document type name is provided.
		c.DocumentType.Name = d.Name
		if err := c.Upsert(db); err != nil {
			return fmt.Errorf("error upserting document type custom field: %w", err)
		}
		customFields = append(customFields, c)
	}
	d.CustomFields = customFields

	return nil
}

// getAssocations gets assocations.
func (d *DocumentType) getAssocations(db *gorm.DB) error {
	// Custom fields.
	var customFields []DocumentTypeCustomField
	for _, c := range d.CustomFields {
		if err := c.Get(db); err != nil {
			return fmt.Errorf("error getting document type custom field: %w", err)
		}
		customFields = append(customFields, c)
	}
	d.CustomFields = customFields

	return nil
}
