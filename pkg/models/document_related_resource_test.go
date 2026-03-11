package models

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm/clause"
)

func TestDocumentRelatedResource(t *testing.T) {
	dsn := os.Getenv("HERMES_TEST_POSTGRESQL_DSN")
	if dsn == "" {
		t.Skip("HERMES_TEST_POSTGRESQL_DSN environment variable isn't set")
	}

	t.Run("Get and Update", func(t *testing.T) {
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

		t.Run("Create documents", func(t *testing.T) {
			_, require := assert.New(t), require.New(t)
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

			d = Document{
				GoogleFileID: "GoogleFileID2",
				DocumentType: DocumentType{
					Name: "DT1",
				},
				Product: Product{
					Name: "Product1",
				},
			}
			err = d.Create(db)
			require.NoError(err)

			d = Document{
				GoogleFileID: "GoogleFileID3",
				DocumentType: DocumentType{
					Name: "DT1",
				},
				Product: Product{
					Name: "Product1",
				},
			}
			err = d.Create(db)
			require.NoError(err)
		})

		t.Run("Try to add related resource without an associated typed related resource",
			func(t *testing.T) {
				_, require := assert.New(t), require.New(t)

				rr := DocumentRelatedResource{
					Document: Document{
						GoogleFileID: "GoogleFileID2",
					},
					SortOrder: 1,
				}
				err := db.
					Omit(clause.Associations).
					Create(&rr).
					Error
				require.Error(err)
			})

		t.Run("Add external link related resource", func(t *testing.T) {
			_, require := assert.New(t), require.New(t)

			rr := DocumentRelatedResourceExternalLink{
				RelatedResource: DocumentRelatedResource{
					Document: Document{
						GoogleFileID: "GoogleFileID2",
					},
					SortOrder: 1,
				},
				Name: "Name1",
				URL:  "URL1",
			}
			err := rr.Create(db)
			require.NoError(err)
		})

		t.Run("Add external link related resource with same SortOrder",
			func(t *testing.T) {
				_, require := assert.New(t), require.New(t)

				rr := DocumentRelatedResourceExternalLink{
					RelatedResource: DocumentRelatedResource{
						Document: Document{
							GoogleFileID: "GoogleFileID2",
						},
						SortOrder: 1,
					},
					Name: "Name2",
					URL:  "URL2",
				}
				err := rr.Create(db)
				require.Error(err)
			})

		t.Run("Add another external link related resource", func(t *testing.T) {
			_, require := assert.New(t), require.New(t)

			rr := DocumentRelatedResourceExternalLink{
				RelatedResource: DocumentRelatedResource{
					Document: Document{
						GoogleFileID: "GoogleFileID2",
					},
					SortOrder: 2,
				},
				Name: "Name2",
				URL:  "URL2",
			}
			err := rr.Create(db)
			require.NoError(err)
		})

		t.Run("Add Hermes document related resource with same SortOrder",
			func(t *testing.T) {
				_, require := assert.New(t), require.New(t)

				rr := DocumentRelatedResourceHermesDocument{
					RelatedResource: DocumentRelatedResource{
						Document: Document{
							GoogleFileID: "GoogleFileID2",
						},
						SortOrder: 2,
					},
					Document: Document{
						GoogleFileID: "GoogleFileID1",
					},
				}
				err := rr.Create(db)
				require.Error(err)
			})

		t.Run("Add Hermes document related resource",
			func(t *testing.T) {
				_, require := assert.New(t), require.New(t)

				rr := DocumentRelatedResourceHermesDocument{
					RelatedResource: DocumentRelatedResource{
						Document: Document{
							GoogleFileID: "GoogleFileID2",
						},
						SortOrder: 3,
					},
					Document: Document{
						GoogleFileID: "GoogleFileID1",
					},
				}
				err := rr.Create(db)
				require.NoError(err)
			})
	})
}
