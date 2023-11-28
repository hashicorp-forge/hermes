package models

import (
	"gorm.io/gorm"
)

// ProjectRelatedResource is a model for a project related resource.
type ProjectRelatedResource struct {
	gorm.Model

	// Project is the project that the related resource is attached to.
	Project   Project
	ProjectID uint `gorm:"uniqueIndex:project_id_sort_order_unique"`

	// RelatedResourceID is the foreign key of the related resource, set by a Gorm
	// polymorphic relationship.
	RelatedResourceID uint `gorm:"default:null;not null"`

	// RelatedResourceType is the table for the related resource, set by a Gorm
	// polymorphic relationship.
	RelatedResourceType string `gorm:"default:null;not null"`

	// SortOrder is the relative order of the related resource in comparison to
	// all of the project's other related resources.
	SortOrder int `gorm:"default:null;not null;uniqueIndex:project_id_sort_order_unique"`
}
