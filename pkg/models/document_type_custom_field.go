package models

import (
	"fmt"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type DocumentTypeCustomField struct {
	gorm.Model

	Name           string
	DocumentTypeID uint
	DocumentType   DocumentType
	ReadOnly       bool
	Type           DocumentTypeCustomFieldType
}

type DocumentTypeCustomFieldType int

const (
	UnspecifiedDocumentTypeCustomFieldType DocumentTypeCustomFieldType = iota
	StringDocumentTypeCustomFieldType
	PersonDocumentTypeCustomFieldType
	PeopleDocumentTypeCustomFieldType
)

// Get gets a document type custom field from database db by name and document
// type name, and assigns it to the receiver.
func (d *DocumentTypeCustomField) Get(db *gorm.DB) error {
	if err := validation.ValidateStruct(d,
		validation.Field(&d.Name, validation.Required),
	); err != nil {
		return err
	}
	if err := validation.ValidateStruct(&d.DocumentType,
		validation.Field(&d.DocumentType.Name, validation.Required),
	); err != nil {
		return err
	}

	if err := d.getAssocations(db); err != nil {
		return fmt.Errorf("error getting associations: %w", err)
	}

	return db.
		Where(DocumentTypeCustomField{
			Name:           d.Name,
			DocumentTypeID: d.DocumentTypeID,
		}).
		Omit(clause.Associations).
		First(&d).
		Error
}

// getAssocations gets assocations.
func (d *DocumentTypeCustomField) getAssocations(db *gorm.DB) error {
	// Get document type.
	if err := d.DocumentType.Get(db); err != nil {
		return fmt.Errorf("error getting document type: %w", err)
	}
	d.DocumentTypeID = d.DocumentType.ID

	return nil
}

// Upsert updates or inserts the receiver into database db.
func (d *DocumentTypeCustomField) Upsert(db *gorm.DB) error {
	if err := validation.ValidateStruct(d,
		validation.Field(&d.Name, validation.Required),
		validation.Field(&d.Type, validation.Required),
	); err != nil {
		return err
	}
	if err := validation.ValidateStruct(&d.DocumentType,
		validation.Field(
			&d.DocumentType.Name, validation.Required),
	); err != nil {
		return err
	}

	if err := d.getAssocations(db); err != nil {
		return fmt.Errorf("error getting associations: %w", err)
	}

	return db.Transaction(func(tx *gorm.DB) error {
		if err := tx.
			Where(DocumentTypeCustomField{
				Name:           d.Name,
				DocumentTypeID: d.DocumentTypeID,
			}).
			Omit(clause.Associations).
			Assign(*d).
			FirstOrCreate(&d).
			Error; err != nil {
			return err
		}

		if err := d.Get(tx); err != nil {
			return fmt.Errorf("error getting the record after upsert: %w", err)
		}

		return nil
	})
}
