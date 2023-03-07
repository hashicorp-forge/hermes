package models

import (
	"fmt"
	"time"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type DocumentReview struct {
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`

	DocumentID uint `gorm:"primaryKey"`
	Document   Document
	UserID     uint `gorm:"primaryKey"`
	User       User
	Status     DocumentReviewStatus
}

type DocumentReviewStatus int

const (
	UnspecifiedDocumentReviewStatus DocumentReviewStatus = iota
	ApprovedDocumentReviewStatus
	ChangesRequestedDocumentReviewStatus
)

// DocumentReviews is a slice of document reviews.
type DocumentReviews []DocumentReview

// BeforeSave is a hook to find or create associations before saving.
func (d *DocumentReview) BeforeSave(tx *gorm.DB) error {
	// Validate required fields.
	if err := validation.ValidateStruct(&d.Document,
		validation.Field(
			&d.Document.GoogleFileID, validation.Required),
	); err != nil {
		return err
	}
	if err := validation.ValidateStruct(&d.User,
		validation.Field(
			&d.User.EmailAddress, validation.Required),
	); err != nil {
		return err
	}

	if err := d.getAssociations(tx); err != nil {
		return fmt.Errorf("error getting associations: %w", err)
	}

	return nil
}

// Find finds all document reviews with the provided query, and assigns them to
// the receiver.
func (d *DocumentReviews) Find(db *gorm.DB, dr DocumentReview) error {
	// Validate required fields.
	if err := validation.ValidateStruct(&dr.Document,
		validation.Field(
			&dr.Document.GoogleFileID,
			validation.When(dr.User.EmailAddress == "",
				validation.Required.Error("at least a Document's GoogleFileID or User's EmailAddress is required"),
			),
		),
	); err != nil {
		return err
	}
	if err := validation.ValidateStruct(&dr.User,
		validation.Field(
			&dr.User.EmailAddress,
			validation.When(dr.Document.GoogleFileID == "",
				validation.Required.Error("at least a Document's GoogleFileID or User's EmailAddress is required"),
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

	// Get user.
	if dr.User.EmailAddress != "" {
		if err := dr.User.Get(db); err != nil {
			return fmt.Errorf("error getting user: %w", err)
		}
		dr.UserID = dr.User.ID
	}

	return db.
		Where(DocumentReview{
			DocumentID: dr.DocumentID,
			UserID:     dr.UserID,
		}).
		Preload(clause.Associations).
		Find(&d).
		Error
}

// Get gets the document review from database db, and assigns it to the
// receiver.
func (d *DocumentReview) Get(db *gorm.DB) error {
	// Validate required fields.
	if err := validation.ValidateStruct(&d.Document,
		validation.Field(&d.Document.GoogleFileID, validation.Required),
	); err != nil {
		return err
	}
	if err := validation.ValidateStruct(&d.User,
		validation.Field(&d.User.EmailAddress, validation.Required),
	); err != nil {
		return err
	}

	if err := d.getAssociations(db); err != nil {
		return fmt.Errorf("error getting associations: %w", err)
	}

	return db.
		Where(DocumentReview{
			DocumentID: d.DocumentID,
			UserID:     d.UserID,
		}).
		Preload(clause.Associations).
		First(&d).
		Error
}

// Update updates the document review in database db.
func (d *DocumentReview) Update(db *gorm.DB) error {
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
func (d *DocumentReview) getAssociations(db *gorm.DB) error {
	// Get document.
	if err := d.Document.Get(db); err != nil {
		return fmt.Errorf("error getting document: %w", err)
	}
	d.DocumentID = d.Document.ID

	// Get user.
	if err := d.User.Get(db); err != nil {
		return fmt.Errorf("error getting user: %w", err)
	}
	d.UserID = d.User.ID

	return nil
}
