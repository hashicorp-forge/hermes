package models

import (
	"gorm.io/gorm"
)

// DocumentRelatedResource is a model for a document related resource.
type DocumentRelatedResource struct {
	gorm.Model

	// Document is the document that the related resource is attached to.
	Document   Document
	DocumentID uint `gorm:"uniqueIndex:document_id_sort_order_unique"`

	// RelatedResourceID is the foreign key of the related resource, set by a Gorm
	// polymorphic relationship.
	RelatedResourceID uint `gorm:"default:null;not null"`

	// RelatedResourceType is the table for the related resource, set by a Gorm
	// polymorphic relationship.
	RelatedResourceType string `gorm:"default:null;not null"`

	// SortOrder is the relative order of the related resource in comparison to
	// all of the document's other related resources.
	SortOrder int `gorm:"default:null;not null;uniqueIndex:document_id_sort_order_unique"`
}
