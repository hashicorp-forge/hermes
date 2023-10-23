package models

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestDocumentFileRevisionwModel(t *testing.T) {
	dsn := os.Getenv("HERMES_TEST_POSTGRESQL_DSN")
	if dsn == "" {
		t.Skip("HERMES_TEST_POSTGRESQL_DSN environment variable isn't set")
	}

	t.Run("Create and Find", func(t *testing.T) {
		db, tearDownTest := setupTest(t, dsn)
		defer tearDownTest(t)

		t.Run("Create a document type", func(t *testing.T) {
			_, require := assert.New(t), require.New(t)
			dt := DocumentType{
				Name:     "DT1",
				LongName: "DocumentType1",
			}
			err := dt.FirstOrCreate(db)
			require.NoError(err)
		})

		t.Run("Create a product", func(t *testing.T) {
			_, require := assert.New(t), require.New(t)
			p := Product{
				Name:         "Product1",
				Abbreviation: "P1",
			}
			err := p.FirstOrCreate(db)
			require.NoError(err)
		})

		t.Run("Create a document", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			d := Document{
				GoogleFileID: "GoogleFileID1",
				DocumentType: DocumentType{
					Name: "DT1",
				},
				Product: Product{
					Name: "Product1",
				},
			}
			err := d.Create(db)
			require.NoError(err)
			assert.EqualValues(1, d.ID)
		})

		t.Run("Create a file revision", func(t *testing.T) {
			_, require := assert.New(t), require.New(t)
			fr := DocumentFileRevision{
				Document: Document{
					GoogleFileID: "GoogleFileID1",
				},
				GoogleDriveFileRevisionID: "GoogleDriveFileRevisionID1",
				Name:                      "Name1",
			}
			err := fr.Create(db)
			require.NoError(err)
		})

		t.Run("Find file revisions for the document", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			var frs DocumentFileRevisions
			err := frs.Find(db, Document{GoogleFileID: "GoogleFileID1"})
			require.NoError(err)
			require.Len(frs, 1)
			assert.EqualValues(1, frs[0].DocumentID)
			assert.Equal(
				"GoogleDriveFileRevisionID1", frs[0].GoogleDriveFileRevisionID)
			assert.Equal("Name1", frs[0].Name)
		})

		t.Run("Create a second file revision", func(t *testing.T) {
			_, require := assert.New(t), require.New(t)
			fr := DocumentFileRevision{
				Document: Document{
					GoogleFileID: "GoogleFileID1",
				},
				GoogleDriveFileRevisionID: "GoogleDriveFileRevisionID2",
				Name:                      "Name2",
			}
			err := fr.Create(db)
			require.NoError(err)
		})

		t.Run("Find file revisions for the document", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			var frs DocumentFileRevisions
			err := frs.Find(db, Document{GoogleFileID: "GoogleFileID1"})
			require.NoError(err)
			require.Len(frs, 2)
			assert.EqualValues(1, frs[0].DocumentID)
			assert.Equal(
				"GoogleDriveFileRevisionID1", frs[0].GoogleDriveFileRevisionID)
			assert.Equal("Name1", frs[0].Name)
			assert.EqualValues(1, frs[1].DocumentID)
			assert.Equal(
				"GoogleDriveFileRevisionID2", frs[1].GoogleDriveFileRevisionID)
			assert.Equal("Name2", frs[1].Name)
		})
	})
}
