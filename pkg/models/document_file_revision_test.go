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
				FileRevisionID: "FileRevisionID1",
				Name:           "Name1",
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
			assert.Equal("FileRevisionID1", frs[0].FileRevisionID)
			assert.Equal("Name1", frs[0].Name)
		})

		t.Run("Create a second file revision", func(t *testing.T) {
			_, require := assert.New(t), require.New(t)
			fr := DocumentFileRevision{
				Document: Document{
					GoogleFileID: "GoogleFileID1",
				},
				FileRevisionID: "FileRevisionID2",
				Name:           "Name2",
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
			assert.Equal("FileRevisionID1", frs[0].FileRevisionID)
			assert.Equal("Name1", frs[0].Name)
			assert.EqualValues(1, frs[1].DocumentID)
			assert.Equal("FileRevisionID2", frs[1].FileRevisionID)
			assert.Equal("Name2", frs[1].Name)
		})
	})
}

// TestDocumentFileRevisionDualBackend verifies that file revision operations
// work with both GoogleFileID and FileID backends.
func TestDocumentFileRevisionDualBackend(t *testing.T) {
	dsn := os.Getenv("HERMES_TEST_POSTGRESQL_DSN")
	if dsn == "" {
		t.Skip("HERMES_TEST_POSTGRESQL_DSN environment variable isn't set")
	}

	backends := []struct {
		name    string
		makeDoc func(id string) Document
	}{
		{
			name:    "GoogleFileID",
			makeDoc: func(id string) Document { return Document{GoogleFileID: id} },
		},
		{
			name:    "FileID",
			makeDoc: func(id string) Document { return Document{FileID: id} },
		},
	}

	for _, backend := range backends {
		backend := backend
		t.Run(backend.name, func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			db, tearDownTest := setupTest(t, dsn)
			defer tearDownTest(t)

			// Setup.
			dt := DocumentType{Name: "DT1", LongName: "DocumentType1"}
			require.NoError(dt.FirstOrCreate(db))
			p := Product{Name: "Product1", Abbreviation: "P1"}
			require.NoError(p.FirstOrCreate(db))

			// Create document.
			d := backend.makeDoc("frTestFile1")
			d.DocumentType = DocumentType{Name: "DT1"}
			d.Product = Product{Name: "Product1"}
			require.NoError(d.Create(db))

			// Create file revision.
			t.Run("Create file revision", func(t *testing.T) {
				fr := DocumentFileRevision{
					Document:       backend.makeDoc("frTestFile1"),
					FileRevisionID: "rev-001",
					Name:           "Revision 1",
				}
				err := fr.Create(db)
				require.NoError(err)
			})

			// Find file revisions.
			t.Run("Find file revisions", func(t *testing.T) {
				var frs DocumentFileRevisions
				err := frs.Find(db, backend.makeDoc("frTestFile1"))
				require.NoError(err)
				require.Len(frs, 1)
				assert.Equal("rev-001", frs[0].FileRevisionID)
				assert.Equal("Revision 1", frs[0].Name)
			})

			// Create second file revision.
			t.Run("Create second file revision", func(t *testing.T) {
				fr := DocumentFileRevision{
					Document:       backend.makeDoc("frTestFile1"),
					FileRevisionID: "rev-002",
					Name:           "Revision 2",
				}
				err := fr.Create(db)
				require.NoError(err)
			})

			// Find returns both.
			t.Run("Find returns both revisions", func(t *testing.T) {
				var frs DocumentFileRevisions
				err := frs.Find(db, backend.makeDoc("frTestFile1"))
				require.NoError(err)
				require.Len(frs, 2)
				assert.Equal("rev-001", frs[0].FileRevisionID)
				assert.Equal("rev-002", frs[1].FileRevisionID)
			})
		})
	}
}
