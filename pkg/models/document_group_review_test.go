package models

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestDocumentGroupReviewModel(t *testing.T) {
	dsn := os.Getenv("HERMES_TEST_POSTGRESQL_DSN")
	if dsn == "" {
		t.Skip("HERMES_TEST_POSTGRESQL_DSN environment variable isn't set")
	}

	t.Run("Create and Get", func(t *testing.T) {
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

		t.Run("Get the review before we create the document", func(t *testing.T) {
			_, require := assert.New(t), require.New(t)
			dr := DocumentGroupReview{
				Document: Document{
					GoogleFileID: "fileID1",
				},
				Group: Group{
					EmailAddress: "team-a@approver.com",
				},
			}
			err := dr.Get(db)
			require.Error(err)
		})

		var d Document
		t.Run("Create a document", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			d = Document{
				GoogleFileID: "fileID1",
				ApproverGroups: []*Group{
					{
						EmailAddress: "team-a@approver.com",
					},
					{
						EmailAddress: "team-b@approver.com",
					},
				},
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

		t.Run("Get the review", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			dr := DocumentGroupReview{
				Document: Document{
					GoogleFileID: "fileID1",
				},
				Group: Group{
					EmailAddress: "team-b@approver.com",
				},
			}
			err := dr.Get(db)
			require.NoError(err)
			assert.EqualValues(1, dr.DocumentID)
			assert.Equal("fileID1", dr.Document.GoogleFileID)
			assert.EqualValues(2, dr.GroupID)
			assert.Equal("team-b@approver.com", dr.Group.EmailAddress)
		})
	})

	t.Run("Find", func(t *testing.T) {
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

		var d1, d2, d3 Document
		t.Run("Create first document", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			d1 = Document{
				GoogleFileID: "fileID1",
				ApproverGroups: []*Group{
					{
						EmailAddress: "team-a@approver.com",
					},
					{
						EmailAddress: "team-b@approver.com",
					},
				},
				DocumentType: DocumentType{
					Name: "DT1",
				},
				Product: Product{
					Name: "Product1",
				},
			}
			err := d1.Create(db)
			require.NoError(err)
			assert.EqualValues(1, d1.ID)
		})

		t.Run("Create second document", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			d2 = Document{
				GoogleFileID: "fileID2",
				ApproverGroups: []*Group{
					{
						EmailAddress: "team-a@approver.com",
					},
				},
				DocumentType: DocumentType{
					Name: "DT1",
				},
				Product: Product{
					Name: "Product1",
				},
			}
			err := d2.Create(db)
			require.NoError(err)
			assert.EqualValues(2, d2.ID)
		})

		t.Run("Create third document", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			d3 = Document{
				GoogleFileID: "fileID3",
				ApproverGroups: []*Group{
					{
						EmailAddress: "team-b@approver.com",
					},
				},
				DocumentType: DocumentType{
					Name: "DT1",
				},
				Product: Product{
					Name: "Product1",
				},
			}
			err := d3.Create(db)
			require.NoError(err)
			assert.EqualValues(3, d3.ID)
		})

		t.Run("Find reviews without any search fields", func(t *testing.T) {
			_, require := assert.New(t), require.New(t)
			var revs DocumentGroupReviews
			err := revs.Find(db, DocumentGroupReview{})
			require.Error(err)
		})

		t.Run("Find all reviews for a document", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			var revs DocumentGroupReviews
			err := revs.Find(db, DocumentGroupReview{
				Document: Document{
					GoogleFileID: "fileID1",
				},
			})
			require.NoError(err)
			require.Len(revs, 2)
			assert.Equal("team-a@approver.com", revs[0].Group.EmailAddress)
			assert.Equal("team-b@approver.com", revs[1].Group.EmailAddress)
		})

		t.Run("Find all reviews for a group", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			var revs DocumentGroupReviews
			err := revs.Find(db, DocumentGroupReview{
				Group: Group{
					EmailAddress: "team-b@approver.com",
				},
			})
			require.NoError(err)
			require.Len(revs, 2)
			assert.Equal("fileID1", revs[0].Document.GoogleFileID)
			assert.Equal("fileID3", revs[1].Document.GoogleFileID)
			assert.Equal("team-b@approver.com", revs[0].Group.EmailAddress)
			assert.Equal("team-b@approver.com", revs[1].Group.EmailAddress)
		})
	})
}
