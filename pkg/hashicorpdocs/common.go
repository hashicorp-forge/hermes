package hashicorpdocs

import (
	"fmt"
	"strings"

	"github.com/hashicorp-forge/hermes/pkg/workspace"
	gw "github.com/hashicorp-forge/hermes/pkg/workspace/adapters/google"
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
	GetApprovedBy() []string
	GetApprovers() []string
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
	GetStatus() string
	GetSummary() string
	GetTitle() string

	MissingFields() []string
	ReplaceHeader(fileID, baseURL string, isDraft bool, provider workspace.Provider) error

	// Setters for fields common to all document types.
	SetApprovedBy([]string)
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
func NewEmptyDoc(docType string) (Doc, error) {
	switch docType {
	case "FRD":
		return &FRD{}, nil
	case "RFC":
		return &RFC{}, nil
	case "PRD":
		return &PRD{}, nil
	default:
		return nil, fmt.Errorf("invalid doc type")
	}
}

// ParseDoc parses and returns a known document type, associated product name,
// document number or returns an error if the type is unknown.
func ParseDoc(
	docType string,
	f *drive.File,
	s *gw.Service,
	allFolders []string) (Doc, error) {

	// TODO: Add a Parse() function to the Doc interface to make this more
	// extensible and not have to address all doc types here.
	switch strings.ToLower(docType) {
	case "frd":
		r, err := NewFRD(f, s, allFolders)
		if err != nil {
			return nil, fmt.Errorf("error parsing FRD: %w", err)
		}
		return r, nil

	case "rfc":
		r, err := NewRFC(f, s, allFolders)
		if err != nil {
			return nil, fmt.Errorf("error parsing RFC: %w", err)
		}
		return r, nil

	case "prd":
		p, err := NewPRD(f, s, allFolders)
		if err != nil {
			return nil, fmt.Errorf("error parsing PRD: %w", err)
		}
		return p, nil

	default:
		return nil, fmt.Errorf("unknown doc type: %s", docType)
	}
}
