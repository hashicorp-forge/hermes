package models

import (
	"encoding/json"
	"fmt"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type DocumentCustomField struct {
	DocumentID                uint `gorm:"primaryKey"`
	DocumentTypeCustomFieldID uint `gorm:"primaryKey"`
	DocumentTypeCustomField   DocumentTypeCustomField
	// Value                     datatypes.JSON
	Value string
}

// BeforeSave is a hook to find or create associations before saving.
func (d *DocumentCustomField) BeforeSave(tx *gorm.DB) error {
	// Get document type custom field, if necessary.
	if d.DocumentTypeCustomFieldID == 0 {
		if err := validation.ValidateStruct(&d.DocumentTypeCustomField,
			validation.Field(
				&d.DocumentTypeCustomField.Name, validation.Required),
		); err != nil {
			return err
		}

		if err := d.DocumentTypeCustomField.Get(tx); err != nil {
			return fmt.Errorf("error getting document type custom field: %w", err)
		}
		d.DocumentTypeCustomFieldID = d.DocumentTypeCustomField.DocumentType.ID
	}

	return nil
}

func (d *DocumentCustomField) Create(db *gorm.DB) error {
	return db.
		Omit(clause.Associations).
		Create(&d).
		Error
}

func (d *DocumentCustomField) Upsert(db *gorm.DB) error {
	return db.
		Where(DocumentCustomField{
			DocumentID:                d.DocumentID,
			DocumentTypeCustomFieldID: d.DocumentTypeCustomFieldID,
		}).
		Preload(clause.Associations).
		FirstOrCreate(&d).Error
}

// UpsertStringDocumentCustomField upserts a string document custom field with
// the provided document type name (documentTypeName), document type custom
// field name (documentTypeCustomFieldName), and value (customFieldValue) into a
// document's custom fields (documentCustomFields), and returns the resulting
// custom field (pointer) slice. If the value is an empty string, the custom
// field will be removed from the result.
func UpsertStringDocumentCustomField(
	documentCustomFields []*DocumentCustomField,
	documentTypeName string,
	documentTypeCustomFieldName string,
	customFieldValue string,
) []*DocumentCustomField {
	// If custom field value is empty, remove it from the document.
	if customFieldValue == "" {
		newCFs := []*DocumentCustomField{}
		for _, cf := range documentCustomFields {
			// If custom field isn't the target one, append it to
			// replacement custom fields.
			if cf.DocumentTypeCustomField.Name != documentTypeCustomFieldName {
				newCFs = append(newCFs, cf)
			}
		}
		return newCFs
	} else {
		// Custom field value isn't empty so upsert it into existing custom
		// fields.
		newCFs := []*DocumentCustomField{}
		foundCF := false
		for _, cf := range documentCustomFields {
			// If custom field is the target one, replace the value and append
			// to replacement custom fields.
			if cf.DocumentTypeCustomField.Name == documentTypeCustomFieldName {
				cf.Value = customFieldValue
				newCFs = append(newCFs, cf)
				foundCF = true
			} else {
				// If custom field isn't the target one, just append it to
				// replacement custom fields.
				newCFs = append(newCFs, cf)
			}
		}
		// If we didn't find and replace the custom field, insert it.
		if !foundCF {
			newCFs = append(newCFs,
				&DocumentCustomField{
					DocumentTypeCustomField: DocumentTypeCustomField{
						Name: documentTypeCustomFieldName,
						DocumentType: DocumentType{
							Name: documentTypeName,
						},
					},
					Value: customFieldValue,
				},
			)
			documentCustomFields = newCFs
		}
		return newCFs
	}
}

// UpsertStringSliceDocumentCustomField upserts a string slice document custom
// field with the provided document type name (documentTypeName), document type
// custom field name (documentTypeCustomFieldName), and value (customFieldValue)
// into a document's custom fields (documentCustomFields), and returns the
// resulting custom field (pointer) slice. If the value is an empty string
// slice, the custom field will be removed from the result.
func UpsertStringSliceDocumentCustomField(
	documentCustomFields []*DocumentCustomField,
	documentTypeName string,
	documentTypeCustomFieldName string,
	customFieldValue []string,
) ([]*DocumentCustomField, error) {
	if len(customFieldValue) > 0 {
		jsonVal, err := json.Marshal(customFieldValue)
		if err != nil {
			return nil,
				fmt.Errorf("error marshaling custom field value to JSON: %w", err)
		}

		// Custom field value isn't empty so upsert it into existing custom
		// fields.
		newCFs := []*DocumentCustomField{}
		foundCF := false
		for _, cf := range documentCustomFields {
			// If custom field is the target one, replace the value and append
			// to replacement custom fields.
			if cf.DocumentTypeCustomField.Name == documentTypeCustomFieldName {
				cf.Value = string(jsonVal)
				newCFs = append(newCFs, cf)
				foundCF = true
			} else {
				// If custom field isn't the target one, just append it to
				// replacement custom fields.
				newCFs = append(newCFs, cf)
			}
		}
		// If we didn't find and replace the custom field, insert it.
		if !foundCF {
			newCFs = append(newCFs,
				&DocumentCustomField{
					DocumentTypeCustomField: DocumentTypeCustomField{
						Name: documentTypeCustomFieldName,
						DocumentType: DocumentType{
							Name: documentTypeName,
						},
					},
					Value: string(jsonVal),
				},
			)
		}
		return newCFs, nil
	} else {
		// Custom field value is empty, so remove it from the document.
		newCFs := []*DocumentCustomField{}
		for _, cf := range documentCustomFields {
			// If custom field isn't the target one, append it to
			// replacement custom fields.
			if cf.DocumentTypeCustomField.Name != documentTypeCustomFieldName {
				newCFs = append(newCFs, cf)
			}
		}
		documentCustomFields = newCFs

		return newCFs, nil
	}
}
