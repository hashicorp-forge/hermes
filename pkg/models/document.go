package models

import (
	"errors"
	"fmt"
	"time"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// Document is a model for a document.
type Document struct {
	gorm.Model

	// GoogleFileID is the Google Drive file ID of the document.
	GoogleFileID string `gorm:"index;not null;unique"`

	// Approvers is the list of users whose approval is requested for the
	// document.
	Approvers []*User `gorm:"many2many:document_reviews;"`

	// Contributors are users who have contributed to the document.
	Contributors []*User `gorm:"many2many:document_contributors;"`

	// CustomFields contains custom fields.
	CustomFields []*DocumentCustomField

	// DocumentCreatedAt is the time of document creation.
	DocumentCreatedAt time.Time

	// DocumentModifiedAt is the time the document was last modified.
	DocumentModifiedAt time.Time

	// DocumentNumber is a document identifier containing a product/area
	// abbreviation and a number (e.g., "TF-123").
	DocumentNumber int `gorm:"index:latest_product_number"`

	// DocumentType is the document type.
	DocumentType   DocumentType
	DocumentTypeID uint

	// Imported is true if the document was not created through the application.
	Imported bool

	// Owner is the owner of the document.
	Owner   *User `gorm:"default:null;not null"`
	OwnerID *uint `gorm:"default:null"`

	// Product is the product or area that the document relates to.
	Product   Product
	ProductID uint `gorm:"index:latest_product_number"`

	// Status is the status of the document.
	Status DocumentStatus

	// Summary is a summary of the document.
	Summary string

	// Title is the title of the document. It only contains the title, and not the
	// product abbreviation, document number, or document type.
	Title string
}

// Documents is a slice of documents.
type Documents []Document

// DocumentStatus is the status of the document (e.g., "WIP", "In-Review",
// "Approved", "Obsolete").
type DocumentStatus int

const (
	UnspecifiedDocumentStatus DocumentStatus = iota
	WIPDocumentStatus
	InReviewDocumentStatus
	ApprovedDocumentStatus
	ObsoleteDocumentStatus
)

// BeforeSave is a hook used to find associations before saving.
func (d *Document) BeforeSave(tx *gorm.DB) error {
	if err := d.getAssociations(tx); err != nil {
		return fmt.Errorf("error getting associations: %w", err)
	}

	return nil
}

// Create creates a document in database db.
func (d *Document) Create(db *gorm.DB) error {
	if err := validation.ValidateStruct(d,
		validation.Field(
			&d.ID,
			validation.When(d.GoogleFileID == "",
				validation.Required.Error("either ID or GoogleFileID is required"),
			),
		),
		validation.Field(
			&d.GoogleFileID,
			validation.When(d.ID == 0,
				validation.Required.Error("either ID or GoogleFileID is required"),
			),
		),
	); err != nil {
		return err
	}

	if err := d.createAssocations(db); err != nil {
		return fmt.Errorf("error creating associations: %w", err)
	}

	return db.Transaction(func(tx *gorm.DB) error {
		if err := tx.
			Model(&d).
			Where(Document{GoogleFileID: d.GoogleFileID}).
			Omit(clause.Associations). // We get associations in the BeforeSave hook.
			Create(&d).
			Error; err != nil {
			return err
		}

		if err := d.replaceAssocations(tx); err != nil {
			return fmt.Errorf("error replacing associations: %w", err)
		}

		return nil
	})
}

// Find finds all documents from database db with the provided query, and
// assigns them to the receiver.
func (d *Documents) Find(db *gorm.DB, query string) error {
	return db.
		Where(query).
		Preload(clause.Associations).
		Find(&d).Error
}

// FirstOrCreate finds the first document by Google file ID or creates a new
// record if it does not exist.
// func (d *Document) FirstOrCreate(db *gorm.DB) error {
// 	return db.
// 		Where(Document{GoogleFileID: d.GoogleFileID}).
// 		Preload(clause.Associations).
// 		FirstOrCreate(&d).Error
// }

// Get gets a document from database db by Google file ID, and assigns it to the
// receiver.
func (d *Document) Get(db *gorm.DB) error {
	if err := validation.ValidateStruct(d,
		validation.Field(
			&d.ID,
			validation.When(d.GoogleFileID == "",
				validation.Required.Error("either ID or GoogleFileID is required"),
			),
		),
		validation.Field(
			&d.GoogleFileID,
			validation.When(d.ID == 0,
				validation.Required.Error("either ID or GoogleFileID is required"),
			),
		),
	); err != nil {
		return err
	}

	if err := db.
		Where(Document{GoogleFileID: d.GoogleFileID}).
		Preload(clause.Associations).
		First(&d).
		Error; err != nil {
		return err
	}

	if err := d.getAssociations(db); err != nil {
		return fmt.Errorf("error getting associations: %w", err)
	}

	return nil
}

// GetLatestProductNumber gets the latest document number for a product.
func GetLatestProductNumber(db *gorm.DB,
	documentTypeName, productName string) (int, error) {
	// Validate required fields.
	if err := validation.Validate(db, validation.Required); err != nil {
		return 0, err
	}
	if err := validation.Validate(productName, validation.Required); err != nil {
		return 0, err
	}

	// Get document type.
	dt := DocumentType{
		Name: documentTypeName,
	}
	if err := dt.Get(db); err != nil {
		return 0, fmt.Errorf("error getting document type: %w", err)
	}

	// Get product.
	p := Product{
		Name: productName,
	}
	if err := p.Get(db); err != nil {
		return 0, fmt.Errorf("error getting product: %w", err)
	}

	// Get document with largest document number.
	var d Document
	if err := db.
		Where(Document{
			DocumentTypeID: dt.ID,
			ProductID:      p.ID,
		}).
		Order("document_number desc").
		First(&d).
		Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return 0, nil
		} else {
			return 0, err
		}
	}

	return d.DocumentNumber, nil
}

// Upsert updates or inserts the receiver document into database db.
func (d *Document) Upsert(db *gorm.DB) error {
	if err := validation.ValidateStruct(d,
		validation.Field(
			&d.ID,
			validation.When(d.GoogleFileID == "",
				validation.Required.Error("either ID or GoogleFileID is required"),
			),
		),
		validation.Field(
			&d.GoogleFileID,
			validation.When(d.ID == 0,
				validation.Required.Error("either ID or GoogleFileID is required"),
			),
		),
	); err != nil {
		return err
	}

	// Create required associations.
	if err := d.createAssocations(db); err != nil {
		return fmt.Errorf("error creating associations: %w", err)
	}

	return db.Transaction(func(tx *gorm.DB) error {
		if err := tx.
			Model(&d).
			Where(Document{GoogleFileID: d.GoogleFileID}).
			Omit(clause.Associations). // We manage associations in the BeforeSave hook.
			Assign(*d).
			FirstOrCreate(&d).
			Error; err != nil {
			return err
		}

		// Replace has-many associations because we may have removed instances.
		if err := d.replaceAssocations(tx); err != nil {
			return fmt.Errorf("error replacing associations: %w", err)
		}

		if err := d.Get(tx); err != nil {
			return fmt.Errorf("error getting the document after upsert: %w", err)
		}

		return nil
	})
}

// createAssocations creates required assocations for a document.
func (d *Document) createAssocations(db *gorm.DB) error {
	// Find or create approvers.
	var approvers []*User
	for _, a := range d.Approvers {
		if err := a.FirstOrCreate(db); err != nil {
			return fmt.Errorf("error finding or creating approver: %w", err)
		}
		approvers = append(approvers, a)
	}
	d.Approvers = approvers

	// Find or create contributors.
	var contributors []*User
	for _, c := range d.Contributors {
		if err := c.FirstOrCreate(db); err != nil {
			return fmt.Errorf("error finding or creating contributor: %w", err)
		}
		contributors = append(contributors, c)
	}
	d.Contributors = contributors

	// Find or create owner.
	if d.Owner != nil && d.Owner.EmailAddress != "" {
		if err := d.Owner.FirstOrCreate(db); err != nil {
			return fmt.Errorf("error finding or creating owner: %w", err)
		}
		d.OwnerID = &d.Owner.ID
	}

	return nil
}

// getAssociations gets associations.
func (d *Document) getAssociations(db *gorm.DB) error {
	// Get approvers.
	var approvers []*User
	for _, a := range d.Approvers {
		if err := a.Get(db); err != nil {
			return fmt.Errorf("error getting approver: %w", err)
		}
		approvers = append(approvers, a)
	}
	d.Approvers = approvers

	// Get contributors.
	var contributors []*User
	for _, c := range d.Contributors {
		if err := c.FirstOrCreate(db); err != nil {
			return fmt.Errorf("error getting contributor: %w", err)
		}
		contributors = append(contributors, c)
	}
	d.Contributors = contributors

	// Get custom fields.
	var customFields []*DocumentCustomField
	for _, c := range d.CustomFields {
		// If we already know the document type custom field ID, get the rest of its
		// data.
		if c.DocumentTypeCustomFieldID != 0 {
			if err := db.
				Model(&c.DocumentTypeCustomField).
				Where(DocumentTypeCustomField{
					Model: gorm.Model{
						ID: c.DocumentTypeCustomFieldID,
					},
				}).
				First(&c.DocumentTypeCustomField).
				Error; err != nil {
				return fmt.Errorf(
					"error getting document type custom field with known ID: %w", err)
			}
		}
		c.DocumentTypeCustomField.DocumentType.Name = d.DocumentType.Name
		if err := c.DocumentTypeCustomField.Get(db); err != nil {
			return fmt.Errorf("error getting document type custom field: %w", err)
		}
		c.DocumentTypeCustomFieldID = c.DocumentTypeCustomField.DocumentType.ID
		customFields = append(customFields, c)
	}
	d.CustomFields = customFields

	// Get document type.
	dt := d.DocumentType
	if err := dt.Get(db); err != nil {
		return fmt.Errorf("error getting document type: %w", err)
	}
	d.DocumentType = dt
	d.DocumentTypeID = dt.ID

	// Get owner.
	if d.Owner != nil && d.Owner.EmailAddress != "" {
		if err := d.Owner.Get(db); err != nil {
			return fmt.Errorf("error getting owner: %w", err)
		}
		d.OwnerID = &d.Owner.ID
	}

	// Get product.
	if d.Product.Name != "" {
		if err := d.Product.Get(db); err != nil {
			return fmt.Errorf("error getting product: %w", err)
		}
		d.ProductID = d.Product.ID
	}

	return nil
}

// replaceAssocations replaces assocations for a document.
func (d *Document) replaceAssocations(db *gorm.DB) error {
	// Replace approvers.
	if err := db.
		Session(&gorm.Session{SkipHooks: true}).
		Model(&d).
		Association("Approvers").
		Replace(d.Approvers); err != nil {
		return err
	}

	// Replace contributors.
	if err := db.
		Session(&gorm.Session{SkipHooks: true}).
		Model(&d).
		Association("Contributors").
		Replace(d.Contributors); err != nil {
		return err
	}

	// Replace custom fields.
	if err := db.
		Session(&gorm.Session{SkipHooks: true}).
		Model(&d).
		Association("CustomFields").
		Replace(d.CustomFields); err != nil {
		return err
	}

	return nil
}
