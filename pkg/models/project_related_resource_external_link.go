package models

import (
	"fmt"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type ProjectRelatedResourceExternalLink struct {
	gorm.Model

	RelatedResource ProjectRelatedResource `gorm:"polymorphic:RelatedResource"`

	Name string `gorm:"default:null;not null"`

	URL string `gorm:"default:null;not null"`
}

type ProjectRelatedResourceExternalLinks []ProjectRelatedResourceExternalLink

func (rr *ProjectRelatedResourceExternalLink) Create(db *gorm.DB) error {
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

	// Preload RelatedResource.Project.
	if rr.RelatedResource.ProjectID == 0 {
		proj := Project{}
		if err := proj.Get(db, rr.RelatedResource.Project.ID); err != nil {
			return fmt.Errorf("error preloading RelatedResource.Project: %w", err)
		}
		rr.RelatedResource.ProjectID = rr.RelatedResource.Project.ID
	}

	return db.
		Omit("RelatedResource.Project").
		Create(&rr).
		Error
}

func (rr *ProjectRelatedResourceExternalLink) Get(db *gorm.DB) error {
	return db.
		Preload(clause.Associations).
		Preload("RelatedResource.Project").
		First(&rr).Error
}
