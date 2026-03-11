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

	// GoogleFileID is the Google Drive file ID. Used when running in Google Workspace mode.
	// For SharePoint deployments, this field is empty/null.
	//
	// DUAL-PROVIDER DESIGN:
	//   We keep both GoogleFileID and FileID as separate columns so that:
	//   1. Existing Google-path code continues to work without changes.
	//   2. SharePoint-path code uses FileID without touching GoogleFileID.
	//   3. Database rows from Google deployments retain their original IDs;
	//      a migration script can populate FileID from GoogleFileID if a
	//      deployment later switches providers.
	//   4. Rollback is safe — the GoogleFileID column is never dropped.
	//   Use GetFileIdentifier() to read the active ID regardless of provider.
	//   Use NewDocumentByFileID(id, useSharePoint) to construct a Document
	//   with the correct field populated.
	GoogleFileID string `gorm:"index;default:null"`

	// FileID is the SharePoint/generic file ID. Used when running in SharePoint mode.
	// For Google deployments, this field is empty/null.
	FileID string `gorm:"index;default:null"`

	// Approvers is the list of users whose approval is requested for the
	// document.
	Approvers []*User `gorm:"many2many:document_reviews;"`

	// ApproverGroups is the list of groups whose approval is requested for the
	// document.
	ApproverGroups []*Group `gorm:"many2many:document_group_reviews;"`

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

	// DocumentFileRevision are the file revisions for the document.
	FileRevisions []DocumentFileRevision

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

	// Archived is true if the document has been archived. Only drafts (WIP status)
	// can be archived, and only by the owner.
	Archived bool

	// Summary is a summary of the document.
	Summary *string

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

// NewDocumentByFileID creates a Document with the correct file-ID field
// populated based on whether SharePoint is in use.
// When useSharePoint is true it sets FileID; otherwise it sets GoogleFileID.
func NewDocumentByFileID(fileID string, useSharePoint bool) Document {
	if useSharePoint {
		return Document{FileID: fileID}
	}
	return Document{GoogleFileID: fileID}
}

// GetFileIdentifier returns the active file ID regardless of which provider
// is active. SharePoint docs use FileID; Google docs use GoogleFileID.
func (d *Document) GetFileIdentifier() string {
	if d.FileID != "" {
		return d.FileID
	}
	return d.GoogleFileID
}

// hasNoFileID returns true if the document has no file identifier set.
func (d *Document) hasNoFileID() bool {
	return d.GoogleFileID == "" && d.FileID == ""
}

// BeforeCreate validates that every document has at least one file identifier.
func (d *Document) BeforeCreate(tx *gorm.DB) error {
	if d.hasNoFileID() {
		return fmt.Errorf("document must have either GoogleFileID or FileID")
	}
	return nil
}

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
			validation.When(d.hasNoFileID(),
				validation.Required.Error("either ID, GoogleFileID, or FileID is required"),
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
			Where(Document{
				GoogleFileID: d.GoogleFileID,
				FileID:       d.FileID,
			}).
			Omit(clause.Associations).
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

// Delete deletes a document in database db.
func (d *Document) Delete(db *gorm.DB) error {
	if err := validation.ValidateStruct(d,
		validation.Field(
			&d.ID,
			validation.When(d.hasNoFileID(),
				validation.Required.Error("either ID, GoogleFileID, or FileID is required"),
			),
		),
	); err != nil {
		return err
	}

	query := db.Model(&d)
	if d.GoogleFileID != "" {
		query = query.Where("google_file_id = ?", d.GoogleFileID)
	} else if d.FileID != "" {
		query = query.Where("file_id = ?", d.FileID)
	} else {
		query = query.Where("id = ?", d.ID)
	}

	return query.Delete(&d).Error
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
// 		Where(Document{FileID: d.FileID}).
// 		Preload(clause.Associations).
// 		FirstOrCreate(&d).Error
// }

// Get gets a document from database db by Google file ID, and assigns it to the
// receiver.
func (d *Document) Get(db *gorm.DB) error {
	if err := validation.ValidateStruct(d,
		validation.Field(
			&d.ID,
			validation.When(d.hasNoFileID(),
				validation.Required.Error("either ID, GoogleFileID, or FileID is required"),
			),
		),
	); err != nil {
		return err
	}

	query := db
	if d.GoogleFileID != "" {
		query = query.Where("google_file_id = ?", d.GoogleFileID)
	} else if d.FileID != "" {
		query = query.Where("file_id = ?", d.FileID)
	} else {
		query = query.Where("id = ?", d.ID)
	}

	if err := query.
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
		Where("document_number IS NOT NULL").
		Order("document_number desc").
		First(&d).
		Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// No documents exist, start from 2000 (return 1999 so next will be 2000)
			return 1999, nil
		} else {
			return 0, err
		}
	}

	// If highest existing number is below 2000, start from 2000
	// Otherwise continue the existing sequence
	if d.DocumentNumber < 2000 {
		return 1999, nil
	}

	return d.DocumentNumber, nil
}

// GetProjects gets all projects associated with document d.
func (d *Document) GetProjects(db *gorm.DB) ([]Project, error) {
	if err := validation.ValidateStruct(d,
		validation.Field(
			&d.ID,
			validation.When(d.hasNoFileID(),
				validation.Required.Error("either ID, GoogleFileID, or FileID is required"),
			),
		),
	); err != nil {
		return nil, err
	}

	// Get document ID if not known.
	if d.ID == 0 {
		doc := &Document{
			GoogleFileID: d.GoogleFileID,
			FileID:       d.FileID,
		}
		if err := doc.Get(db); err != nil {
			return nil, fmt.Errorf("error getting document: %w", err)
		}
		d.ID = doc.ID
	}

	// Find all projects that have the document as a related resource.
	var projs []Project
	if err := db.Table("projects").
		Joins("JOIN project_related_resources prr ON projects.id = prr.project_id").
		Joins("JOIN project_related_resource_hermes_documents prrhd ON prr.related_resource_id = prrhd.id").
		Where("prr.related_resource_type = ? AND prrhd.document_id = ?", "project_related_resource_hermes_documents", d.ID).
		Find(&projs).Error; err != nil {
		return nil, fmt.Errorf("error getting projects for document: %w", err)
	}

	return projs, nil
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
			validation.When(d.hasNoFileID(),
				validation.Required.Error("either ID, GoogleFileID, or FileID is required"),
			),
		),
	); err != nil {
		return err
	}

	// Get document ID if not known.
	if d.ID == 0 {
		doc := &Document{
			GoogleFileID: d.GoogleFileID,
			FileID:       d.FileID,
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
			validation.When(d.hasNoFileID(),
				validation.Required.Error("either ID, GoogleFileID, or FileID is required"),
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
			validation.When(d.hasNoFileID(),
				validation.Required.Error("either ID, GoogleFileID, or FileID is required"),
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
			Where(Document{
				GoogleFileID: d.GoogleFileID,
				FileID:       d.FileID,
			}).
			Select("*").
			Omit(clause.Associations).
			Assign(*d).
			FirstOrCreate(&d).
			Error; err != nil {
			return err
		}

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

	// Find or create approver groups.
	var approverGroups []*Group
	for _, a := range d.ApproverGroups {
		if err := a.FirstOrCreate(db); err != nil {
			return fmt.Errorf("error finding or creating approver groups: %w", err)
		}
		approverGroups = append(approverGroups, a)
	}
	d.ApproverGroups = approverGroups

	// Find or create contributors.
	var contributors []*User
	for _, c := range d.Contributors {
		if err := c.FirstOrCreate(db); err != nil {
			return fmt.Errorf("error finding or creating contributor: %w", err)
		}
		contributors = append(contributors, c)
	}
	d.Contributors = contributors

	// Get document type if DocumentTypeID is not set.
	if d.DocumentTypeID == 0 && d.DocumentType.Name != "" {
		if err := d.DocumentType.Get(db); err != nil {
			return fmt.Errorf("error getting document type: %w", err)
		}
		d.DocumentTypeID = d.DocumentType.ID
	}

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

	// Get approver groups.
	var approverGroups []*Group
	for _, a := range d.ApproverGroups {
		if err := a.Get(db); err != nil {
			return fmt.Errorf("error getting approver group: %w", err)
		}
		approverGroups = append(approverGroups, a)
	}
	d.ApproverGroups = approverGroups

	// Get contributors.
	var contributors []*User
	for _, c := range d.Contributors {
		if err := c.FirstOrCreate(db); err != nil {
			return fmt.Errorf("error getting contributor: %w", err)
		}
		contributors = append(contributors, c)
	}
	d.Contributors = contributors

	// Get document type.
	dt := d.DocumentType
	if err := dt.Get(db); err != nil {
		return fmt.Errorf("error getting document type: %w", err)
	}
	d.DocumentType = dt
	d.DocumentTypeID = dt.ID

	// Get custom fields.
	var customFields []*DocumentCustomField
	for _, c := range d.CustomFields {
		c.DocumentTypeCustomField.DocumentType = d.DocumentType
		c.DocumentTypeCustomField.DocumentTypeID = d.DocumentTypeID

		// Get document type custom field.
		if c.DocumentTypeCustomFieldID == 0 {
			c.DocumentTypeCustomField.DocumentType = d.DocumentType
			c.DocumentTypeCustomField.DocumentTypeID = d.DocumentTypeID

			if err := c.DocumentTypeCustomField.Get(db); err != nil {
				return fmt.Errorf("error getting document type custom field: %w", err)
			}
			c.DocumentTypeCustomFieldID = c.DocumentTypeCustomField.ID
		} else {
			if err := db.
				First(&c.DocumentTypeCustomField, c.DocumentTypeCustomFieldID).
				Error; err != nil {
				return fmt.Errorf(
					"error getting document type custom field by ID: %w", err)
			}
		}

		customFields = append(customFields, c)
	}
	d.CustomFields = customFields

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
		Unscoped().
		Association("Approvers").
		Replace(d.Approvers); err != nil {
		return err
	}

	// Replace approver groups.
	if err := db.
		Session(&gorm.Session{SkipHooks: true}).
		Model(&d).
		Unscoped().
		Association("ApproverGroups").
		Replace(d.ApproverGroups); err != nil {
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
	if err := db.Transaction(func(db *gorm.DB) error {
		if err := validation.ValidateStruct(d,
			validation.Field(
				&d.ID,
				validation.When(d.hasNoFileID(),
					validation.Required.Error("either ID, GoogleFileID, or FileID is required"),
				),
			),
		); err != nil {
			return err
		}

		// Get document ID if not known.
		if d.ID == 0 {
			doc := &Document{
				GoogleFileID: d.GoogleFileID,
				FileID:       d.FileID,
			}
			if err := doc.Get(db); err != nil {
				return fmt.Errorf("error getting document: %w", err)
			}
			d.ID = doc.ID
		}

		// Delete existing DocumentCustomFields.
		if err := db.
			Unscoped(). // Hard delete instead of soft delete.
			Where("document_id = ?", d.ID).
			Delete(&DocumentCustomField{}).Error; err != nil {
			return fmt.Errorf(
				"error deleting existing document custom fields: %w", err)
		}

		// Create all DocumentCustomFields.
		for _, cf := range d.CustomFields {
			cf.DocumentID = d.ID
			if err := cf.Create(db); err != nil {
				return fmt.Errorf(
					"error creating document custom field: %w", err)
			}
		}

		return nil
	}); err != nil {
		return fmt.Errorf("error replacing document custom fields: %w", err)
	}

	return nil
}
