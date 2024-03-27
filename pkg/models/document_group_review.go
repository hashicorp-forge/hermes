package models

import (
	"fmt"
	"time"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type DocumentGroupReview struct {
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`

	DocumentID uint `gorm:"primaryKey"`
	Document   Document
	GroupID    uint `gorm:"primaryKey"`
	Group      Group
}

// DocumentReviews is a slice of document reviews.
type DocumentGroupReviews []DocumentGroupReview

// BeforeSave is a hook to find or create associations before saving.
func (d *DocumentGroupReview) BeforeSave(tx *gorm.DB) error {
	// Validate required fields.
	if err := validation.ValidateStruct(&d.Document,
		validation.Field(
			&d.Document.GoogleFileID, validation.Required),
	); err != nil {
		return err
	}
	if err := validation.ValidateStruct(&d.Group,
		validation.Field(
			&d.Group.EmailAddress, validation.Required),
	); err != nil {
		return err
	}

	if err := d.getAssociations(tx); err != nil {
		return fmt.Errorf("error getting associations: %w", err)
	}

	return nil
}

// Find finds all document group reviews with the provided query, and assigns
// them to the receiver.
func (d *DocumentGroupReviews) Find(db *gorm.DB, dr DocumentGroupReview) error {
	// Validate required fields.
	if err := validation.ValidateStruct(&dr.Document,
		validation.Field(
			&dr.Document.GoogleFileID,
			validation.When(dr.Group.EmailAddress == "",
				validation.Required.Error(
					"at least a Document's GoogleFileID or Group's EmailAddress is required"),
			),
		),
	); err != nil {
		return err
	}
	if err := validation.ValidateStruct(&dr.Group,
		validation.Field(
			&dr.Group.EmailAddress,
			validation.When(dr.Document.GoogleFileID == "",
				validation.Required.Error(
					"at least a Document's GoogleFileID or Group's EmailAddress is required"),
			),
		),
	); err != nil {
		return err
	}

	// Get document.
	if dr.Document.GoogleFileID != "" {
		if err := dr.Document.Get(db); err != nil {
			return fmt.Errorf("error getting document: %w", err)
		}
		dr.DocumentID = dr.Document.ID
	}

	// Get group.
	if dr.Group.EmailAddress != "" {
		if err := dr.Group.Get(db); err != nil {
			return fmt.Errorf("error getting group: %w", err)
		}
		dr.GroupID = dr.Group.ID
	}

	return db.
		Where(DocumentGroupReview{
			DocumentID: dr.DocumentID,
			GroupID:    dr.GroupID,
		}).
		Preload(clause.Associations).
		Find(&d).
		Error
}

// Get gets the document group review from database db, and assigns it to the
// receiver.
func (d *DocumentGroupReview) Get(db *gorm.DB) error {
	// Validate required fields.
	if err := validation.ValidateStruct(&d.Document,
		validation.Field(&d.Document.GoogleFileID, validation.Required),
	); err != nil {
		return err
	}
	if err := validation.ValidateStruct(&d.Group,
		validation.Field(&d.Group.EmailAddress, validation.Required),
	); err != nil {
		return err
	}

	if err := d.getAssociations(db); err != nil {
		return fmt.Errorf("error getting associations: %w", err)
	}

	return db.
		Where(DocumentGroupReview{
			DocumentID: d.DocumentID,
			GroupID:    d.GroupID,
		}).
		Preload(clause.Associations).
		First(&d).
		Error
}

// Update updates the document review in database db.
func (d *DocumentGroupReview) Update(db *gorm.DB) error {
	if err := d.getAssociations(db); err != nil {
		return fmt.Errorf("error getting associations: %w", err)
	}

	return db.
		Model(&d).
		Omit(clause.Associations).
		Updates(*d).
		Error
}

// getAssociations gets associations.
func (d *DocumentGroupReview) getAssociations(db *gorm.DB) error {
	// Get document.
	if err := d.Document.Get(db); err != nil {
		return fmt.Errorf("error getting document: %w", err)
	}
	d.DocumentID = d.Document.ID

	// Get group.
	if err := d.Group.Get(db); err != nil {
		return fmt.Errorf("error getting group: %w", err)
	}
	d.GroupID = d.Group.ID

	return nil
}
