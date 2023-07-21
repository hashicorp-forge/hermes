package models

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestDocumentType(t *testing.T) {
	dsn := os.Getenv("HERMES_TEST_POSTGRESQL_DSN")
	if dsn == "" {
		t.Skip("HERMES_TEST_POSTGRESQL_DSN environment variable isn't set")
	}

	t.Run("FirstOrCreate and Get", func(t *testing.T) {
		assert, require := assert.New(t), require.New(t)
		db, tearDownTest := setupTest(t, dsn)
		defer tearDownTest(t)

		// Get document type, which won't exist yet (should error).
		d := DocumentType{
			Name: "DT1",
		}
		err := d.Get(db)
		require.Error(err)
		require.ErrorIs(gorm.ErrRecordNotFound, err)

		// Create a document type.
		d = DocumentType{
			Name:     "DT1",
		}
		err = d.FirstOrCreate(db)
		require.NoError(err)
		assert.EqualValues(1, d.ID)
		assert.Equal("DT1", d.Name)

		// Get the document type.
		d = DocumentType{
			Name: "DT1",
		}
		err = d.Get(db)
		require.NoError(err)
		assert.EqualValues(1, d.ID)
		assert.Equal("DT1", d.Name)

		// Create another document type.
		d = DocumentType{
			Name:     "DT2",
		}
		err = d.FirstOrCreate(db)
		require.NoError(err)
		assert.EqualValues(2, d.ID)
		assert.Equal("DT2", d.Name)

		// Get the document type.
		d = DocumentType{
			Name: "DT2",
		}
		err = d.Get(db)
		require.NoError(err)
		assert.EqualValues(2, d.ID)
		assert.Equal("DT2", d.Name)

		// Get all document types.
		ds := DocumentTypes{}
		err = ds.GetAll(db)
		require.NoError(err)
		require.Len(ds, 2)
		assert.EqualValues(1, ds[0].ID)
		assert.Equal("DT1", ds[0].Name)
		assert.EqualValues(2, ds[1].ID)
		assert.Equal("DT2", ds[1].Name)
	})

	t.Run("FirstOrCreate with custom fields", func(t *testing.T) {
		db, tearDownTest := setupTest(t, dsn)
		defer tearDownTest(t)

		t.Run("Create document type", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			d := DocumentType{
				Name:     "DT1",
				CustomFields: []DocumentTypeCustomField{
					{
						Name: "CustomStringField",
						Type: StringDocumentTypeCustomFieldType,
					},
					{
						Name: "CustomPersonField",
						Type: PersonDocumentTypeCustomFieldType,
					},
					{
						Name: "CustomPeopleField",
						Type: PeopleDocumentTypeCustomFieldType,
					},
				},
			}
			err := d.FirstOrCreate(db)
			require.NoError(err)
			assert.EqualValues(1, d.ID)
			assert.Equal("DT1", d.Name)
			require.Len(d.CustomFields, 3)
			assert.Equal("CustomStringField", d.CustomFields[0].Name)
			assert.Equal(StringDocumentTypeCustomFieldType, d.CustomFields[0].Type)
			assert.Equal("CustomPersonField", d.CustomFields[1].Name)
			assert.Equal(PersonDocumentTypeCustomFieldType, d.CustomFields[1].Type)
			assert.Equal("CustomPeopleField", d.CustomFields[2].Name)
			assert.Equal(PeopleDocumentTypeCustomFieldType, d.CustomFields[2].Type)
		})

		t.Run("Get document type", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			d := DocumentType{
				Name: "DT1",
			}
			err := d.Get(db)
			require.NoError(err)
			assert.EqualValues(1, d.ID)
			assert.Equal("DT1", d.Name)
			require.Len(d.CustomFields, 3)
			assert.Equal("CustomStringField", d.CustomFields[0].Name)
			assert.Equal(StringDocumentTypeCustomFieldType, d.CustomFields[0].Type)
			assert.Equal("CustomPersonField", d.CustomFields[1].Name)
			assert.Equal(PersonDocumentTypeCustomFieldType, d.CustomFields[1].Type)
			assert.Equal("CustomPeopleField", d.CustomFields[2].Name)
			assert.Equal(PeopleDocumentTypeCustomFieldType, d.CustomFields[2].Type)
		})
	})
}
