package document

import (
	"encoding/json"
	"fmt"
	"reflect"

	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/iancoleman/strcase"
	"github.com/mitchellh/mapstructure"
)

type Document struct {
	// ObjectID is the Google Drive file ID for the document.
	ObjectID string `json:"objectID,omitempty"`

	// Title is the title of the document. It does not contain the document number
	// (e.g., "TF-123").
	Title string `json:"title,omitempty"`

	// DocType is the type of document (e.g., "RFC", "PRD").
	DocType string `json:"docType,omitempty"`

	// DocNumber is a unique document identifier containing a product/area
	// abbreviation and a unique number (e.g., "TF-123").
	DocNumber string `json:"docNumber,omitempty"`

	// AppCreated should be set to true if the document was created through this
	// application, and false if created directly in Google Docs and indexed
	// afterwards.
	AppCreated bool `json:"appCreated,omitempty"`

	// ApprovedBy is a slice of email address strings for users that have approved
	// the document.
	ApprovedBy []string `json:"approvedBy,omitempty"`

	// Approvers is a slice of email address strings for users whose approvals
	// are requested for the document.
	Approvers []string `json:"approvers,omitempty"`

	// ChangesRequestedBy is a slice of email address strings for users that have
	// requested changes for the document.
	ChangesRequestedBy []string `json:"changesRequestedBy,omitempty"`

	// Contributors is a slice of email address strings for users who have
	// contributed to the document.
	Contributors []string `json:"contributors,omitempty"`

	// Content is the plaintext content of the document.
	Content string `json:"content,omitempty"`

	// Created is the UTC time of document creation, in a RFC 3339 string format.
	Created string `json:"created,omitempty"`

	// CreatedTime is the time of document creation, in Unix time.
	CreatedTime int64 `json:"createdTime,omitempty"`

	// CustomEditableFields are all document-type-specific fields that are
	// editable.
	CustomEditableFields map[string]CustomDocTypeField `json:"customEditableFields,omitempty"`

	// CustomFields are custom fields that contain values too.
	// TODO: consolidate with CustomEditableFields.
	CustomFields []CustomField `json:"customFields,omitempty"`

	// FileRevisions is a map of file revision IDs to custom names.
	FileRevisions map[string]string `json:"fileRevisions,omitempty"`

	// TODO: LinkedDocs is not used yet.
	LinkedDocs []string `json:"linkedDocs,omitempty"`

	// Locked is true if the document is locked for editing.
	Locked bool `json:"locked,omitempty"`

	// MetaTags contains metadata tags that can be used for filtering in Algolia.
	MetaTags []string `json:"_tags,omitempty"`

	// Created is the time that the document was last modified, in Unix time.
	ModifiedTime int64 `json:"modifiedTime,omitempty"`

	// Owners is a slice of email address strings for document owners. Hermes
	// generally only uses the first element as the document owner, but this is a
	// slice for historical reasons as some HashiCorp documents have had multiple
	// owners in the past.
	Owners []string `json:"owners,omitempty"`

	// OwnerPhotos is a slice of URL strings for the profile photos of the
	// document owners (in the same order as the Owners field).
	OwnerPhotos []string `json:"ownerPhotos,omitempty"`

	// Product is the product or area that the document relates to.
	Product string `json:"product,omitempty"`

	// Summary is a summary of the document.
	Summary string `json:"summary,omitempty"`

	// Status is the status of the document (e.g., "WIP", "In-Review", "Approved",
	// "Obsolete").
	Status string `json:"status,omitempty"`

	// Tags is a slice of tags to help users discover the document based on their
	// interests.
	Tags []string `json:"tags,omitempty"`

	// ThumbnailLink is a URL string for the document thumbnail image.
	ThumbnailLink string `json:"thumbnailLink,omitempty"`
}

type CustomDocTypeField struct {
	// DisplayName is the display name of the custom document-type field.
	DisplayName string `json:"displayName"`

	// Type is the type of the custom document-type field. It is used by the
	// frontend to display the proper input component.
	// Valid values: "PEOPLE", "STRING".
	Type string `json:"type"`
}

type CustomField struct {
	// Name is the name of the custom field.
	// TODO: consolidate with DisplayName and make corresponding frontend changes
	//   to support this.
	Name string `json:"name"`

	// DisplayName is the display name of the custom field.
	DisplayName string `json:"displayName"`

	// Type is the type of the custom field. It is used by the frontend to display
	// the proper input component.
	// Valid values: "PEOPLE", "STRING".
	Type string `json:"type"`

	// Value is the value of the custom field.
	Value any
}

// NewFromAlgoliaObject creates a document from a document Algolia object.
func NewFromAlgoliaObject(
	in map[string]any, docTypes []*config.DocumentType) (*Document, error) {

	doc := &Document{}

	if err := mapstructure.Decode(in, &doc); err != nil {
		return nil, fmt.Errorf("error decoding to document: %w", err)
	}

	// Build CustomFields and CustomEditableFields.
	// Note: This is redundant but we're doing this to maintain compatibility with
	// the way these documents have been defined. This will change with the next
	// version of the API.
	cefs := make(map[string]CustomDocTypeField)
	cfs := []CustomField{}

	if objDocType, ok := in["docType"]; !ok {
		return nil, fmt.Errorf("docType not found in object")
	} else {
		foundDocType := false
		for _, dt := range docTypes {
			if dt.Name == objDocType {
				foundDocType = true
				for _, cf := range dt.CustomFields {
					ccName := strcase.ToLowerCamel(cf.Name)
					switch cf.Type {
					case "string":
						if v, ok := in[ccName]; ok {
							if v, ok := v.(string); ok {
								cfs = append(cfs, CustomField{
									Name:        ccName,
									DisplayName: cf.Name,
									Type:        "STRING",
									Value:       v,
								})
							} else {
								return nil, fmt.Errorf(
									"wrong type for custom field key %q, want string", ccName)
							}
						}
						cefs[ccName] = CustomDocTypeField{
							DisplayName: cf.Name,
							Type:        "STRING",
						}
					case "people":
						cfVal := []string{}
						if v, ok := in[ccName]; ok {
							if reflect.TypeOf(v).Kind() == reflect.Slice {
								for _, vv := range v.([]any) {
									if vv, ok := vv.(string); ok {
										cfVal = append(cfVal, vv)
									} else {
										return nil, fmt.Errorf(
											"wrong type for custom field key %q, want []string",
											ccName)
									}
								}
								cfs = append(cfs, CustomField{
									Name:        ccName,
									DisplayName: cf.Name,
									Type:        "PEOPLE",
									Value:       cfVal,
								})
							} else {
								return nil, fmt.Errorf(
									"wrong type for custom field key %q, want []string", dt.Name)
							}
						}
						cefs[ccName] = CustomDocTypeField{
							DisplayName: cf.Name,
							Type:        "PEOPLE",
						}
					default:
						return nil, fmt.Errorf(
							"unknown type for custom field key %q: %s", dt.Name, cf.Type)
					}
				}
				break
			}
		}
		if !foundDocType {
			return nil, fmt.Errorf("invalid doc type: %s", objDocType)
		}
		doc.CustomFields = cfs
		doc.CustomEditableFields = cefs
	}

	return doc, nil
}

// ToAlgoliaObject converts a document to a document Algolia object.
func (d Document) ToAlgoliaObject(
	removeCustomEditableFields bool) (map[string]any, error) {

	// Remove CustomEditableFields, if configured.
	if removeCustomEditableFields {
		d.CustomEditableFields = nil
	}

	// Save and remove custom fields.
	cfs := d.CustomFields
	d.CustomFields = nil

	// Convert to Algolia object by marshaling to JSON and unmarshaling back.
	var obj map[string]any
	if bytes, err := json.Marshal(d); err != nil {
		return nil, fmt.Errorf("error marshaling document object to JSON: %w", err)
	} else {
		if err := json.Unmarshal(bytes, &obj); err != nil {
			return nil, fmt.Errorf("error unmarshaling JSON to object: %w", err)
		}
	}

	// Set custom fields.
	for _, cf := range cfs {
		obj[cf.Name] = cf.Value
	}

	return obj, nil
}

func (d *Document) UpsertCustomField(cf CustomField) error {
	// Build new document CustomFields.
	var newCFs []CustomField
	foundCF := false
	for _, docCF := range d.CustomFields {
		if docCF.Name == cf.Name {
			// Validate rest of custom field.
			if cf.DisplayName != docCF.DisplayName {
				return fmt.Errorf("incorrect display name for custom field")
			}
			switch cf.Type {
			case "PEOPLE":
				if reflect.TypeOf(cf.Value).Kind() != reflect.Slice {
					return fmt.Errorf("incorrect value type for custom field")
				}
				for _, v := range cf.Value.([]any) {
					// Make sure slice is a string slice.
					if _, ok := v.(string); !ok {
						return fmt.Errorf("incorrect value type for custom field")
					}
				}
				// If the value is empty, remove it from the document (by not appending
				// here).
				if len(cf.Value.([]any)) > 0 {
					newCFs = append(newCFs, cf)
				}
			case "STRING":
				v, ok := cf.Value.(string)
				if !ok {
					return fmt.Errorf("incorrect value type for custom field")
				}
				// If the value is empty, remove it from the document (by not appending
				// here).
				if v != "" {
					newCFs = append(newCFs, cf)
				}
			}
			foundCF = true
		} else {
			newCFs = append(newCFs, docCF)
		}
	}

	// If we didn't find the custom field, insert it.
	if !foundCF {
		newCFs = append(newCFs, cf)
	}

	d.CustomFields = newCFs

	return nil
}

func (d *Document) DeleteFileRevision(revisionID string) {
	delete(d.FileRevisions, revisionID)
}

func (d *Document) SetFileRevision(revisionID, revisionName string) {
	if d.FileRevisions == nil {
		d.FileRevisions = map[string]string{
			revisionID: revisionName,
		}
	} else {
		d.FileRevisions[revisionID] = revisionName
	}
}

func GetStringValue(in map[string]any, key string) (string, error) {
	if v, ok := in[key]; ok {
		if v, ok := v.(string); ok {
			return v, nil
		} else {
			return "", fmt.Errorf("wrong type for key %q, want string", key)
		}
	} else {
		return "", fmt.Errorf("key %q not found", key)
	}
}

func GetStringSliceValue(in map[string]any, key string) ([]string, error) {
	ret := []string{}
	if v, ok := in[key]; ok {
		if reflect.TypeOf(v).Kind() == reflect.Slice {
			for _, vv := range v.([]any) {
				if vv, ok := vv.(string); ok {
					ret = append(ret, vv)
				} else {
					return nil, fmt.Errorf("wrong type for key %q, want []string", key)
				}
			}
			return ret, nil
		} else {
			return nil, fmt.Errorf("wrong type for key %q, want []string", key)
		}
	} else {
		return nil, fmt.Errorf("key %q not found", key)
	}
}
