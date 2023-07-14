package models

import (
	"fmt"
	"github.com/google/uuid"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// ProductLatestDocumentNumber is a model for latest product document numbers.
type ProductLatestDocumentNumber struct {
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`

	DocumentType   DocumentType
	DocumentTypeID uint `gorm:"primaryKey"`
	Product        Product
	ProductID      uuid.UUID `gorm:"primaryKey"`

	// LatestDocumentNumber is a the latest document number per product and
	// document type.
	LatestDocumentNumber int `gorm:"default:null;not null"`
}

// BeforeSave is a hook to find or create associations before saving.
func (p *ProductLatestDocumentNumber) BeforeSave(tx *gorm.DB) error {
	if err := p.getAssociations(tx); err != nil {
		return fmt.Errorf("error getting associations: %w", err)
	}

	return nil
}

// Get gets the latest product number and assigns it to the receiver.
func (p *ProductLatestDocumentNumber) Get(db *gorm.DB) error {
	if err := p.getAssociations(db); err != nil {
		return fmt.Errorf("error getting associations: %w", err)
	}

	return db.
		Where(ProductLatestDocumentNumber{
			DocumentType: DocumentType{
				Name: p.DocumentType.Name,
			},
			Product: Product{
				Name: p.Product.Name,
			},
		}).
		Preload(clause.Associations).
		First(&p).Error
}

// Upsert updates or inserts the receiver document into database db.
func (p *ProductLatestDocumentNumber) Upsert(db *gorm.DB) error {
	return db.
		Where(ProductLatestDocumentNumber{
			DocumentType: DocumentType{
				Name: p.DocumentType.Name,
			},
			Product: Product{
				Name: p.Product.Name,
			},
		}).
		Assign(*p).
		FirstOrCreate(&p).
		Error
}

// getAssociations gets required associations, creating them where appropriate.
func (p *ProductLatestDocumentNumber) getAssociations(tx *gorm.DB) error {
	// Find or create document type.
	dt := p.DocumentType
	if err := dt.FirstOrCreate(tx); err != nil {
		return fmt.Errorf("error getting document type: %w", err)
	}
	p.DocumentType = dt
	p.DocumentTypeID = dt.ID

	// Find or create product.
	product := p.Product
	if err := product.FirstOrCreate(tx); err != nil {
		return fmt.Errorf("error getting product: %w", err)
	}
	p.Product = product
	p.ProductID = product.ID

	return nil
}
