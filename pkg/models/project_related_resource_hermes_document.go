package models

import (
	"fmt"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"gorm.io/gorm"
)

type ProjectRelatedResourceHermesDocument struct {
	gorm.Model

	RelatedResource ProjectRelatedResource `gorm:"polymorphic:RelatedResource"`

	// Document is the target related Hermes document.
	Document   Document
	DocumentID uint
}

func (rr *ProjectRelatedResourceHermesDocument) Create(db *gorm.DB) error {
	// Validate required fields.
	if err := validation.ValidateStruct(&rr.RelatedResource,
		validation.Field(&rr.RelatedResource.ProjectID,
			validation.When(rr.RelatedResource.Project.ID == 0,
				validation.Required.Error("Project ID is required"),
			),
		),
	); err != nil {
		return err
	}
	if err := validation.ValidateStruct(&rr.RelatedResource.Project,
		validation.Field(&rr.RelatedResource.Project.ID,
			validation.When(rr.RelatedResource.ProjectID == 0,
				validation.Required.Error("Project ID is required"),
			),
		),
	); err != nil {
		return err
	}

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

	// Preload RelatedResource.Project.
	if rr.RelatedResource.ProjectID == 0 {
		proj := Project{}
		if err := proj.Get(db, rr.RelatedResource.Project.ID); err != nil {
			return fmt.Errorf("error preloading RelatedResource.Project: %w", err)
		}
		rr.RelatedResource.ProjectID = rr.RelatedResource.Project.ID
	}

	return db.
		Omit("Document").
		Omit("RelatedResource.Project").
		Create(&rr).
		Error
}
