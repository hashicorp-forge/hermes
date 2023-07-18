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

	// DocumentNumber is a document number unique to each product/area. It
	// pairs with the product abbreviation to form a document identifier
	// (e.g., "TF-123").
	DocumentNumber int `gorm:"index:latest_product_number"`

	// DocumentType is the document type.
	DocumentType   DocumentType
	DocumentTypeID uint

	// Imported is true if the document was not created through the application.
	Imported bool

	// Locked is true if the document cannot be updated (may be in a bad state).
	Locked bool

	// Owner is the owner of the document.
	Owner   *User `gorm:"default:null;not null"`
	OwnerID *uint `gorm:"default:null"`

	// Product is the product or area that the document relates to.
	Product   Product
	ProductID uint `gorm:"index:latest_product_number"`

	// RelatedResources are the related resources for the document.
	RelatedResources []*DocumentRelatedResource

	// Status is the status of the document.
	Status DocumentStatus

	// ShareableAsDraft is true if the document can be shared in the WIP (draft)
	// status.
	ShareableAsDraft bool

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
func (d *Documents) Find(
	db *gorm.DB, query interface{}, queryArgs ...interface{}) error {

	return db.
		Where(query, queryArgs...).
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
		Preload("RelatedResources", func(db *gorm.DB) *gorm.DB {
			return db.Order("document_related_resources.sort_order ASC")
		}).
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

// ReplaceRelatedResources replaces related resources for document d.
func (d *Document) ReplaceRelatedResources(
	db *gorm.DB,
	elrrs []DocumentRelatedResourceExternalLink,
	hdrrs []DocumentRelatedResourceHermesDocument,
) error {
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

	// Get document ID if not known.
	if d.ID == 0 {
		doc := &Document{
			GoogleFileID: d.GoogleFileID,
		}
		if err := doc.Get(db); err != nil {
			return fmt.Errorf("error getting document: %w", err)
		}
		d.ID = doc.ID
	}

	if err := db.Transaction(func(tx *gorm.DB) error {
		// Delete assocations of RelatedResources.
		rrs := []DocumentRelatedResource{}
		if err := tx.
			Where("document_id = ?", d.ID).
			Find(&rrs).Error; err != nil {
			return fmt.Errorf("error finding existing related resources: %w", err)
		}
		for _, rr := range rrs {
			if err := tx.
				Exec(
					fmt.Sprintf("DELETE FROM %q WHERE id = ?", rr.RelatedResourceType),
					rr.RelatedResourceID,
				).
				Error; err != nil {
				return fmt.Errorf(
					"error deleting existing typed related resources: %w", err)
			}
		}

		// Delete RelatedResources.
		if err := tx.
			Unscoped(). // Hard delete instead of soft delete.
			Where("document_id = ?", d.ID).
			Delete(&DocumentRelatedResource{}).Error; err != nil {
			return fmt.Errorf("error deleting existing related resources: %w", err)
		}

		// Create all related resources.
		for _, elrr := range elrrs {
			if err := elrr.Create(tx); err != nil {
				return fmt.Errorf(
					"error creating external link related resource: %w", err)
			}
		}
		for _, hdrr := range hdrrs {
			if err := hdrr.Create(tx); err != nil {
				return fmt.Errorf(
					"error creating Hermes document related resource: %w", err)
			}
		}

		return nil
	}); err != nil {
		return fmt.Errorf("error replacing related resources: %w", err)
	}

	return nil
}

// GetRelatedResources returns typed related resources for document d.
func (d *Document) GetRelatedResources(db *gorm.DB) (
	elrrs []DocumentRelatedResourceExternalLink,
	hdrrs []DocumentRelatedResourceHermesDocument,
	err error,
) {
	if err = validation.ValidateStruct(d,
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
		return
	}

	// Get the document.
	if err := d.Get(db); err != nil {
		return nil, nil, fmt.Errorf("error getting document: %w", err)
	}

	// Get related resources.
	for _, rr := range d.RelatedResources {
		switch rr.RelatedResourceType {
		case "document_related_resource_external_links":
			elrr := DocumentRelatedResourceExternalLink{}
			if err := db.
				Where("id = ?", rr.RelatedResourceID).
				Preload(clause.Associations).
				First(&elrr).Error; err != nil {
				return nil,
					nil,
					fmt.Errorf("error getting external link related resource: %w", err)
			}
			elrrs = append(elrrs, elrr)
		case "document_related_resource_hermes_documents":
			hdrr := DocumentRelatedResourceHermesDocument{}
			if err := db.
				Where("id = ?", rr.RelatedResourceID).
				Preload(clause.Associations).
				First(&hdrr).Error; err != nil {
				return nil,
					nil,
					fmt.Errorf(
						"error getting document for Hermes document related resource: %w",
						err)
			}
			hdrrs = append(hdrrs, hdrr)
		default:
			return nil,
				nil,
				fmt.Errorf("unknown related resource type: %s", rr.RelatedResourceType)
		}
	}

	return
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

	// Get product if ProductID is not set.
	if d.ProductID == 0 && d.Product.Name != "" {
		if err := d.Product.Get(db); err != nil {
			return fmt.Errorf("error getting product: %w", err)
		}
		d.ProductID = d.Product.ID
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
