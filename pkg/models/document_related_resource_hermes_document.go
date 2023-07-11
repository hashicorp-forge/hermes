package models

import (
	"fmt"

	"gorm.io/gorm"
)

type DocumentRelatedResourceHermesDocument struct {
	gorm.Model

	RelatedResource DocumentRelatedResource `gorm:"polymorphic:RelatedResource"`

	// Document is the target related document.
	Document   Document
	DocumentID uint
}

func (rr *DocumentRelatedResourceHermesDocument) Create(db *gorm.DB) error {
	// Preload Document.
	if rr.DocumentID == 0 {
		if err := db.
			Where(Document{GoogleFileID: rr.Document.GoogleFileID}).
			First(&rr.Document).
			Error; err != nil {
			return fmt.Errorf("error preloading RelatedResource.Document: %w", err)
		}
		rr.DocumentID = rr.Document.ID
	}

	// Preload RelatedResource.Document.
	if rr.RelatedResource.DocumentID == 0 {
		if err := db.
			Where(Document{GoogleFileID: rr.RelatedResource.Document.GoogleFileID}).
			First(&rr.RelatedResource.Document).
			Error; err != nil {
			return fmt.Errorf("error preloading RelatedResource.Document: %w", err)
		}
		rr.RelatedResource.DocumentID = rr.RelatedResource.Document.ID
	}

	return db.
		Omit("Document").
		Omit("RelatedResource.Document").
		Create(&rr).
		Error
}
