package hashicorpdocs

import (
	"fmt"

	gw "github.com/hashicorp-forge/hermes/pkg/googleworkspace"
	"google.golang.org/api/drive/v3"
)

const (
	// MaxDocSize is the maximum size of a doc's content in bytes. If the doc is
	// larger than this, its content will be trimmed to this length.
	// Algolia has a hard limit of 100000 bytes total per record.
	MaxDocSize = 85000
)

type Doc interface {
	DeleteFileRevision(string)

	// Getters for fields common to all document types.
	GetReviewedBy() []string
	GetReviewers() []string
	GetChangesRequestedBy() []string
	GetContributors() []string
	GetCreatedTime() int64
	GetDocNumber() string
	GetDocType() string
	GetMetaTags() []string
	GetModifiedTime() int64
	GetObjectID() string
	GetOwners() []string
	GetProduct() string
	GetTeam() string
	GetProject() string
	GetStatus() string
	GetSummary() string
	GetTitle() string

	MissingFields() []string
	ReplaceHeader(fileID, baseURL string, isDraft bool, s *gw.Service) error

	// Setters for fields common to all document types.
	SetReviewedBy([]string)
	SetChangesRequestedBy([]string)
	SetContent(s string)
	SetDocNumber(string)
	SetFileRevision(string, string)
	SetLocked(bool)
	SetModifiedTime(int64)
	SetStatus(string)

	GetCustomEditableFields() map[string]CustomDocTypeField
	SetCustomEditableFields()
}

var ValidCustomDocTypeFieldTypes = []string{
	"PEOPLE",
	"STRING",
}

type CustomDocTypeField struct {
	// DisplayName is the display name of the custom document-type field.
	DisplayName string `json:"displayName"`

	// Type is the type of the custom document-type field. It is used by the
	// frontend to display the proper input component.
	// Valid values: "PEOPLE", "STRING".
	Type string `json:"type"`
}

type MissingFields struct {
	ObjectID      string   `json:"objectID,omitempty"`
	MissingFields []string `json:"missingFields,omitempty"`
}

// NewEmptyDoc returns an empty doc struct for the provided doc type.
// new version of new empty doc for custom template
func NewEmptyDoc(docType string) (Doc, error) {
	return &COMMONTEMPLATE{}, nil
}

// ParseDoc parses and returns a known document type, associated product name,
// document number or returns an error if the type is unknown.
func ParseDoc(
	docType string,
	f *drive.File,
	s *gw.Service,
	allFolders []string) (Doc, error) {
	p, err := NewCOMMONTEMPLATE(f, s, allFolders)
	if err != nil {
		return nil, fmt.Errorf("error parsing doc Type: %w", err)
	}
	return p, nil

	// TODO: Add a Parse() function to the Doc interface to make this more
	// extensible and not have to address all doc types here.
}
