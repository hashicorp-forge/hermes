package models

import (
	"fmt"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type DocumentRelatedResourceExternalLink struct {
	gorm.Model

	RelatedResource DocumentRelatedResource `gorm:"polymorphic:RelatedResource"`

	Name string `gorm:"default:null;not null"`

	URL string `gorm:"default:null;not null"`
}

type DocumentRelatedResourceExternalLinks []DocumentRelatedResourceExternalLink

func (rr *DocumentRelatedResourceExternalLink) Create(db *gorm.DB) error {
	// Preload RelatedResource.Document.
	if rr.RelatedResource.DocumentID == 0 {
		query := db
		if rr.RelatedResource.Document.GoogleFileID != "" {
			query = query.Where("google_file_id = ?", rr.RelatedResource.Document.GoogleFileID)
		} else {
			query = query.Where("file_id = ?", rr.RelatedResource.Document.FileID)
		}
		if err := query.
			First(&rr.RelatedResource.Document).
			Error; err != nil {
			return fmt.Errorf("error preloading RelatedResource.Document: %w", err)
		}
		rr.RelatedResource.DocumentID = rr.RelatedResource.Document.ID
	}

	return db.
		Omit("RelatedResource.Document").
		Create(&rr).
		Error
}

func (rr *DocumentRelatedResourceExternalLink) Get(db *gorm.DB) error {
	return db.
		Preload(clause.Associations).
		Preload("RelatedResource.Document").
		First(&rr).Error
}
