package models

import (
	"fmt"
	"strings"
	"time"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// Project is a model for a project.
type Project struct {
	gorm.Model

	// Creator is the user that created the project.
	Creator   User
	CreatorID uint `gorm:"default:null;not null"`

	// Description is a description of the project.
	Description *string

	// JiraIssueID is the ID of the Jira issue associated with the project.
	JiraIssueID *string

	// ProjectCreatedAt is the time of project creation.
	ProjectCreatedAt time.Time `gorm:"default:null;not null"`

	// ProjectModifiedAt is the time the project was last modified.
	ProjectModifiedAt time.Time `gorm:"default:null;not null"`

	// RelatedResources are the related resources for the project.
	RelatedResources []*ProjectRelatedResource

	// Status is the status of the document.
	Status ProjectStatus `gorm:"default:null;not null"`

	// Title is the title of the project.
	Title string `gorm:"default:null;not null"`
}

// ProjectStatus is the status of the project.
type ProjectStatus int

const (
	UnspecifiedProjectStatus ProjectStatus = iota
	ActiveProjectStatus
	CompletedProjectStatus
	ArchivedProjectStatus
)

var (
	projectStatusStrings = map[ProjectStatus]string{
		ActiveProjectStatus:    "active",
		CompletedProjectStatus: "completed",
		ArchivedProjectStatus:  "archived",
	}
)

func (s ProjectStatus) String() string {
	return projectStatusStrings[s]
}

func ParseProjectStatusString(s string) (ProjectStatus, bool) {
	// Reverse keys and values of strings map.
	m := make(map[string]ProjectStatus, len(projectStatusStrings))
	for k, v := range projectStatusStrings {
		m[v] = k
	}

	v, ok := m[strings.ToLower(s)]
	return v, ok
}

// Create creates a new project. The resulting project is saved back to the
// receiver.
func (p *Project) Create(db *gorm.DB) error {
	// Validate required fields.
	if err := validation.ValidateStruct(p,
		validation.Field(&p.Title, validation.Required),
	); err != nil {
		return err
	}
	if err := validation.ValidateStruct(&p.Creator,
		validation.Field(
			&p.Creator.ID,
			validation.When(p.Creator.EmailAddress == "",
				validation.Required.Error("either ID or EmailAddress is required"),
			),
		),
		validation.Field(
			&p.Creator.EmailAddress,
			validation.When(p.Creator.ID == 0,
				validation.Required.Error("either ID or EmailAddress is required"),
			),
		),
	); err != nil {
		return err
	}

	// Preload associations.
	if err := p.preloadAssocations(db); err != nil {
		return fmt.Errorf("error preloading associations: %w", err)
	}

	now := time.Now()
	p.ProjectCreatedAt = now.UTC()
	p.ProjectModifiedAt = now.UTC()
	p.Status = ActiveProjectStatus

	return db.
		Omit(clause.Associations).
		Create(&p).
		Error
}

// Get gets a project by ID.
func (p *Project) Get(db *gorm.DB, id uint) error {
	// Validate required fields.
	if err := validation.Validate(id, validation.Required); err != nil {
		return err
	}

	return db.
		Preload(clause.Associations).
		First(&p, id).
		Error
}

// GetRelatedResources returns typed related resources for project p.
func (p *Project) GetRelatedResources(db *gorm.DB) (
	elrrs []ProjectRelatedResourceExternalLink,
	hdrrs []ProjectRelatedResourceHermesDocument,
	err error,
) {
	// Validate required fields.
	if err := validation.Validate(p.ID, validation.Required); err != nil {
		return nil, nil, err
	}

	// Find external link related resources.
	if err := db.
		Model(&ProjectRelatedResourceExternalLink{}).
		Joins("JOIN project_related_resources ON project_related_resources.related_resource_id = project_related_resource_external_links.id").
		Where("project_related_resources.project_id = ? AND project_related_resources.related_resource_type = ?",
			p.ID, "project_related_resource_external_links").
		Preload(clause.Associations).
		Find(&elrrs).
		Error; err != nil {
		return nil,
			nil,
			fmt.Errorf("error getting external link related resources: %w", err)
	}

	// Find Hermes document related resources.
	if err := db.
		Model(&ProjectRelatedResourceHermesDocument{}).
		Joins("JOIN project_related_resources ON project_related_resources.related_resource_id = project_related_resource_hermes_documents.id").
		Where("project_related_resources.project_id = ? AND project_related_resources.related_resource_type = ?",
			p.ID, "project_related_resource_hermes_documents").
		Preload(clause.Associations).
		Preload("Document.DocumentType").
		Preload("Document.Owner").
		Preload("Document.Product").
		Find(&hdrrs).
		Error; err != nil {
		return nil,
			nil,
			fmt.Errorf("error getting Hermes document related resources: %w", err)
	}

	return
}

// ReplaceRelatedResources replaces related resources for project p.
func (p *Project) ReplaceRelatedResources(
	db *gorm.DB,
	elrrs []ProjectRelatedResourceExternalLink,
	hdrrs []ProjectRelatedResourceHermesDocument,
) error {
	// Validate required fields.
	if err := validation.Validate(p.ID, validation.Required); err != nil {
		return err
	}

	if err := db.Transaction(func(tx *gorm.DB) error {
		// Delete assocations of RelatedResources.
		rrs := []ProjectRelatedResource{}
		if err := tx.
			Where("project_id = ?", p.ID).
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
			Where("project_id = ?", p.ID).
			Delete(&ProjectRelatedResource{}).Error; err != nil {
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

// Update updates a project. The resulting project is saved back to the
// receiver.
func (p *Project) Update(db *gorm.DB) error {
	// Validate required fields.
	if err := validation.ValidateStruct(p,
		validation.Field(&p.ID, validation.Required),
	); err != nil {
		return err
	}

	now := time.Now()
	p.ProjectModifiedAt = now.UTC()

	// Build fields to omit during an update. Because we use `Select("*")` to
	// allow removal of values for non-required fields, we need to do this
	// manually.
	omitFields := []string{
		"Creator",
		"CreatorID",
		"ProjectCreatedAt",
	}
	if p.Description == nil {
		omitFields = append(omitFields, "Description")
	}
	if p.JiraIssueID == nil {
		omitFields = append(omitFields, "JiraIssueID")
	}
	if p.Status == UnspecifiedProjectStatus {
		omitFields = append(omitFields, "Status")
	}
	if p.Title == "" {
		omitFields = append(omitFields, "Title")
	}

	return db.Transaction(func(tx *gorm.DB) error {
		if err := tx.
			Model(&p).
			Select("*").
			Omit(omitFields...).
			Updates(p).
			Error; err != nil {
			return err
		}

		if err := p.Get(tx, p.ID); err != nil {
			return fmt.Errorf("error getting the project after update: %w", err)
		}

		return nil
	})
}

// preloadAssocations preloads assocations for a project.
func (p *Project) preloadAssocations(db *gorm.DB) error {
	// Preload Creator.
	if err := p.Creator.FirstOrCreate(db); err != nil {
		return fmt.Errorf("error finding or creating Creator: %w", err)
	}
	p.CreatorID = p.Creator.ID

	return nil
}
