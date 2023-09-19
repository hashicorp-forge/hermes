package models

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestUpsertStringDocumentCustomField(t *testing.T) {
	cases := map[string]struct {
		documentCustomFields        []*DocumentCustomField
		documentTypeName            string
		documentTypeCustomFieldName string
		customFieldValue            string
		wantDocumentCustomFields    []*DocumentCustomField
	}{
		"upsert nothing into empty document custom fields": {
			documentCustomFields:        []*DocumentCustomField{},
			documentTypeName:            "DT1",
			documentTypeCustomFieldName: "DocumentTypeCustomFieldName1",
			customFieldValue:            "",
			wantDocumentCustomFields:    []*DocumentCustomField{},
		},
		"insert one custom field into empty document custom fields": {
			documentCustomFields:        []*DocumentCustomField{},
			documentTypeName:            "DT1",
			documentTypeCustomFieldName: "DocumentTypeCustomFieldName1",
			customFieldValue:            "Value1",
			wantDocumentCustomFields: []*DocumentCustomField{
				{
					DocumentID: 1,
					DocumentTypeCustomField: DocumentTypeCustomField{
						Name: "DocumentTypeCustomFieldName1",
						DocumentType: DocumentType{
							Name: "DT1",
						},
					},
					Value: "Value1",
				},
			},
		},
		"insert one custom field into document custom fields with one item": {
			documentCustomFields: []*DocumentCustomField{
				{
					DocumentID: 1,
					DocumentTypeCustomField: DocumentTypeCustomField{
						Name: "DocumentTypeCustomFieldName1",
						DocumentType: DocumentType{
							Name: "DT1",
						},
					},
					Value: "Value1",
				},
			},
			documentTypeName:            "DT1",
			documentTypeCustomFieldName: "DocumentTypeCustomFieldName2",
			customFieldValue:            "Value2",
			wantDocumentCustomFields: []*DocumentCustomField{
				{
					DocumentID: 1,
					DocumentTypeCustomField: DocumentTypeCustomField{
						Name: "DocumentTypeCustomFieldName1",
						DocumentType: DocumentType{
							Name: "DT1",
						},
					},
					Value: "Value1",
				},
				{
					DocumentID: 1,
					DocumentTypeCustomField: DocumentTypeCustomField{
						Name: "DocumentTypeCustomFieldName2",
						DocumentType: DocumentType{
							Name: "DT1",
						},
					},
					Value: "Value2",
				},
			},
		},
		"insert one custom field into document custom fields with more than one item": {
			documentCustomFields: []*DocumentCustomField{
				{
					DocumentID: 1,
					DocumentTypeCustomField: DocumentTypeCustomField{
						Name: "DocumentTypeCustomFieldName1",
						DocumentType: DocumentType{
							Name: "DT1",
						},
					},
					Value: "Value1",
				},
				{
					DocumentID: 1,
					DocumentTypeCustomField: DocumentTypeCustomField{
						Name: "DocumentTypeCustomFieldName2",
						DocumentType: DocumentType{
							Name: "DT1",
						},
					},
					Value: "Value2",
				},
			},
			documentTypeName:            "DT1",
			documentTypeCustomFieldName: "DocumentTypeCustomFieldName3",
			customFieldValue:            "Value3",
			wantDocumentCustomFields: []*DocumentCustomField{
				{
					DocumentID: 1,
					DocumentTypeCustomField: DocumentTypeCustomField{
						Name: "DocumentTypeCustomFieldName1",
						DocumentType: DocumentType{
							Name: "DT1",
						},
					},
					Value: "Value1",
				},
				{
					DocumentID: 1,
					DocumentTypeCustomField: DocumentTypeCustomField{
						Name: "DocumentTypeCustomFieldName2",
						DocumentType: DocumentType{
							Name: "DT1",
						},
					},
					Value: "Value2",
				},
				{
					DocumentID: 1,
					DocumentTypeCustomField: DocumentTypeCustomField{
						Name: "DocumentTypeCustomFieldName3",
						DocumentType: DocumentType{
							Name: "DT1",
						},
					},
					Value: "Value3",
				},
			},
		},
		"update one custom field into document custom fields with more than one item": {
			documentCustomFields: []*DocumentCustomField{
				{
					DocumentID: 1,
					DocumentTypeCustomField: DocumentTypeCustomField{
						Name: "DocumentTypeCustomFieldName1",
						DocumentType: DocumentType{
							Name: "DT1",
						},
					},
					Value: "Value1",
				},
				{
					DocumentID: 1,
					DocumentTypeCustomField: DocumentTypeCustomField{
						Name: "DocumentTypeCustomFieldName2",
						DocumentType: DocumentType{
							Name: "DT1",
						},
					},
					Value: "Value2",
				},
				{
					DocumentID: 1,
					DocumentTypeCustomField: DocumentTypeCustomField{
						Name: "DocumentTypeCustomFieldName3",
						DocumentType: DocumentType{
							Name: "DT1",
						},
					},
					Value: "Value3",
				},
			},
			documentTypeName:            "DT1",
			documentTypeCustomFieldName: "DocumentTypeCustomFieldName2",
			customFieldValue:            "NewValue",
			wantDocumentCustomFields: []*DocumentCustomField{
				{
					DocumentID: 1,
					DocumentTypeCustomField: DocumentTypeCustomField{
						Name: "DocumentTypeCustomFieldName1",
						DocumentType: DocumentType{
							Name: "DT1",
						},
					},
					Value: "Value1",
				},
				{
					DocumentID: 1,
					DocumentTypeCustomField: DocumentTypeCustomField{
						Name: "DocumentTypeCustomFieldName2",
						DocumentType: DocumentType{
							Name: "DT1",
						},
					},
					Value: "NewValue",
				},
				{
					DocumentID: 1,
					DocumentTypeCustomField: DocumentTypeCustomField{
						Name: "DocumentTypeCustomFieldName3",
						DocumentType: DocumentType{
							Name: "DT1",
						},
					},
					Value: "Value3",
				},
			},
		},
		"remove one custom field from document custom fields with more than one item": {
			documentCustomFields: []*DocumentCustomField{
				{
					DocumentID: 1,
					DocumentTypeCustomField: DocumentTypeCustomField{
						Name: "DocumentTypeCustomFieldName1",
						DocumentType: DocumentType{
							Name: "DT1",
						},
					},
					Value: "Value1",
				},
				{
					DocumentID: 1,
					DocumentTypeCustomField: DocumentTypeCustomField{
						Name: "DocumentTypeCustomFieldName2",
						DocumentType: DocumentType{
							Name: "DT1",
						},
					},
					Value: "Value2",
				},
				{
					DocumentID: 1,
					DocumentTypeCustomField: DocumentTypeCustomField{
						Name: "DocumentTypeCustomFieldName3",
						DocumentType: DocumentType{
							Name: "DT1",
						},
					},
					Value: "Value3",
				},
			},
			documentTypeName:            "DT1",
			documentTypeCustomFieldName: "DocumentTypeCustomFieldName2",
			customFieldValue:            "",
			wantDocumentCustomFields: []*DocumentCustomField{
				{
					DocumentID: 1,
					DocumentTypeCustomField: DocumentTypeCustomField{
						Name: "DocumentTypeCustomFieldName1",
						DocumentType: DocumentType{
							Name: "DT1",
						},
					},
					Value: "Value1",
				},
				{
					DocumentID: 1,
					DocumentTypeCustomField: DocumentTypeCustomField{
						Name: "DocumentTypeCustomFieldName3",
						DocumentType: DocumentType{
							Name: "DT1",
						},
					},
					Value: "Value3",
				},
			},
		},
	}

	for name, c := range cases {
		t.Run(name, func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			got := UpsertStringDocumentCustomField(
				c.documentCustomFields,
				c.documentTypeName,
				c.documentTypeCustomFieldName,
				c.customFieldValue,
			)

			require.Len(got, len(c.wantDocumentCustomFields))
			for i := range got {
				assert.Equal(c.wantDocumentCustomFields[i].Value, got[i].Value)
				assert.Equal(
					c.wantDocumentCustomFields[i].DocumentTypeCustomField.Name,
					got[i].DocumentTypeCustomField.Name,
				)
				assert.Equal(
					c.documentTypeName,
					got[i].DocumentTypeCustomField.DocumentType.Name,
				)
			}
		})
	}
}

func TestUpsertStringSliceDocumentCustomField(t *testing.T) {
	cases := map[string]struct {
		documentCustomFields        []*DocumentCustomField
		documentTypeName            string
		documentTypeCustomFieldName string
		customFieldValue            []string
		wantDocumentCustomFields    []*DocumentCustomField
		shouldErr                   bool
	}{
		"upsert nothing into empty document custom fields": {
			documentCustomFields:        []*DocumentCustomField{},
			documentTypeName:            "DT1",
			documentTypeCustomFieldName: "DocumentTypeCustomFieldName1",
			customFieldValue:            []string{},
			wantDocumentCustomFields:    []*DocumentCustomField{},
		},
		"insert one custom field into empty document custom fields": {
			documentCustomFields:        []*DocumentCustomField{},
			documentTypeName:            "DT1",
			documentTypeCustomFieldName: "DocumentTypeCustomFieldName1",
			customFieldValue:            []string{"Value1"},
			wantDocumentCustomFields: []*DocumentCustomField{
				{
					DocumentID: 1,
					DocumentTypeCustomField: DocumentTypeCustomField{
						Name: "DocumentTypeCustomFieldName1",
						DocumentType: DocumentType{
							Name: "DT1",
						},
					},
					Value: "[\"Value1\"]",
				},
			},
		},
		"insert one custom field into document custom fields with one item": {
			documentCustomFields: []*DocumentCustomField{
				{
					DocumentID: 1,
					DocumentTypeCustomField: DocumentTypeCustomField{
						Name: "DocumentTypeCustomFieldName1",
						DocumentType: DocumentType{
							Name: "DT1",
						},
					},
					Value: "Value1",
				},
			},
			documentTypeName:            "DT1",
			documentTypeCustomFieldName: "DocumentTypeCustomFieldName2",
			customFieldValue:            []string{"Value2"},
			wantDocumentCustomFields: []*DocumentCustomField{
				{
					DocumentID: 1,
					DocumentTypeCustomField: DocumentTypeCustomField{
						Name: "DocumentTypeCustomFieldName1",
						DocumentType: DocumentType{
							Name: "DT1",
						},
					},
					Value: "Value1",
				},
				{
					DocumentID: 1,
					DocumentTypeCustomField: DocumentTypeCustomField{
						Name: "DocumentTypeCustomFieldName2",
						DocumentType: DocumentType{
							Name: "DT1",
						},
					},
					Value: "[\"Value2\"]",
				},
			},
		},
		"insert one custom field into document custom fields with more than one item": {
			documentCustomFields: []*DocumentCustomField{
				{
					DocumentID: 1,
					DocumentTypeCustomField: DocumentTypeCustomField{
						Name: "DocumentTypeCustomFieldName1",
						DocumentType: DocumentType{
							Name: "DT1",
						},
					},
					Value: "Value1",
				},
				{
					DocumentID: 1,
					DocumentTypeCustomField: DocumentTypeCustomField{
						Name: "DocumentTypeCustomFieldName2",
						DocumentType: DocumentType{
							Name: "DT1",
						},
					},
					Value: "[\"Value2\"]",
				},
			},
			documentTypeName:            "DT1",
			documentTypeCustomFieldName: "DocumentTypeCustomFieldName3",
			customFieldValue:            []string{"Value3"},
			wantDocumentCustomFields: []*DocumentCustomField{
				{
					DocumentID: 1,
					DocumentTypeCustomField: DocumentTypeCustomField{
						Name: "DocumentTypeCustomFieldName1",
						DocumentType: DocumentType{
							Name: "DT1",
						},
					},
					Value: "Value1",
				},
				{
					DocumentID: 1,
					DocumentTypeCustomField: DocumentTypeCustomField{
						Name: "DocumentTypeCustomFieldName2",
						DocumentType: DocumentType{
							Name: "DT1",
						},
					},
					Value: "[\"Value2\"]",
				},
				{
					DocumentID: 1,
					DocumentTypeCustomField: DocumentTypeCustomField{
						Name: "DocumentTypeCustomFieldName3",
						DocumentType: DocumentType{
							Name: "DT1",
						},
					},
					Value: "[\"Value3\"]",
				},
			},
		},
		"update one custom field into document custom fields with more than one item": {
			documentCustomFields: []*DocumentCustomField{
				{
					DocumentID: 1,
					DocumentTypeCustomField: DocumentTypeCustomField{
						Name: "DocumentTypeCustomFieldName1",
						DocumentType: DocumentType{
							Name: "DT1",
						},
					},
					Value: "Value1",
				},
				{
					DocumentID: 1,
					DocumentTypeCustomField: DocumentTypeCustomField{
						Name: "DocumentTypeCustomFieldName2",
						DocumentType: DocumentType{
							Name: "DT1",
						},
					},
					Value: "[\"Value2\"]",
				},
				{
					DocumentID: 1,
					DocumentTypeCustomField: DocumentTypeCustomField{
						Name: "DocumentTypeCustomFieldName3",
						DocumentType: DocumentType{
							Name: "DT1",
						},
					},
					Value: "[\"Value3\"]",
				},
			},
			documentTypeName:            "DT1",
			documentTypeCustomFieldName: "DocumentTypeCustomFieldName2",
			customFieldValue:            []string{"NewValue"},
			wantDocumentCustomFields: []*DocumentCustomField{
				{
					DocumentID: 1,
					DocumentTypeCustomField: DocumentTypeCustomField{
						Name: "DocumentTypeCustomFieldName1",
						DocumentType: DocumentType{
							Name: "DT1",
						},
					},
					Value: "Value1",
				},
				{
					DocumentID: 1,
					DocumentTypeCustomField: DocumentTypeCustomField{
						Name: "DocumentTypeCustomFieldName2",
						DocumentType: DocumentType{
							Name: "DT1",
						},
					},
					Value: "[\"NewValue\"]",
				},
				{
					DocumentID: 1,
					DocumentTypeCustomField: DocumentTypeCustomField{
						Name: "DocumentTypeCustomFieldName3",
						DocumentType: DocumentType{
							Name: "DT1",
						},
					},
					Value: "[\"Value3\"]",
				},
			},
		},
		"remove one custom field from document custom fields with more than one item": {
			documentCustomFields: []*DocumentCustomField{
				{
					DocumentID: 1,
					DocumentTypeCustomField: DocumentTypeCustomField{
						Name: "DocumentTypeCustomFieldName1",
						DocumentType: DocumentType{
							Name: "DT1",
						},
					},
					Value: "Value1",
				},
				{
					DocumentID: 1,
					DocumentTypeCustomField: DocumentTypeCustomField{
						Name: "DocumentTypeCustomFieldName2",
						DocumentType: DocumentType{
							Name: "DT1",
						},
					},
					Value: "[\"Value2\"]",
				},
				{
					DocumentID: 1,
					DocumentTypeCustomField: DocumentTypeCustomField{
						Name: "DocumentTypeCustomFieldName3",
						DocumentType: DocumentType{
							Name: "DT1",
						},
					},
					Value: "[\"Value3\"]",
				},
			},
			documentTypeName:            "DT1",
			documentTypeCustomFieldName: "DocumentTypeCustomFieldName2",
			customFieldValue:            []string{},
			wantDocumentCustomFields: []*DocumentCustomField{
				{
					DocumentID: 1,
					DocumentTypeCustomField: DocumentTypeCustomField{
						Name: "DocumentTypeCustomFieldName1",
						DocumentType: DocumentType{
							Name: "DT1",
						},
					},
					Value: "Value1",
				},
				{
					DocumentID: 1,
					DocumentTypeCustomField: DocumentTypeCustomField{
						Name: "DocumentTypeCustomFieldName3",
						DocumentType: DocumentType{
							Name: "DT1",
						},
					},
					Value: "[\"Value3\"]",
				},
			},
		},
	}

	for name, c := range cases {
		t.Run(name, func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)

			got, err := UpsertStringSliceDocumentCustomField(
				c.documentCustomFields,
				c.documentTypeName,
				c.documentTypeCustomFieldName,
				c.customFieldValue,
			)

			if c.shouldErr {
				require.Error(err)
			}
			require.Len(got, len(c.wantDocumentCustomFields))
			for i := range got {
				assert.Equal(c.wantDocumentCustomFields[i].Value, got[i].Value)
				assert.Equal(
					c.wantDocumentCustomFields[i].DocumentTypeCustomField.Name,
					got[i].DocumentTypeCustomField.Name,
				)
				assert.Equal(
					c.documentTypeName,
					got[i].DocumentTypeCustomField.DocumentType.Name,
				)
			}
		})
	}
}
