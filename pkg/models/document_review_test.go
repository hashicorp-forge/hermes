package models

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestDocumentReviewModel(t *testing.T) {
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

		t.Run("Get the review before we create the document", func(t *testing.T) {
			_, require := assert.New(t), require.New(t)
			dr := DocumentReview{
				Document: Document{
					GoogleFileID: "fileID1",
				},
				User: User{
					EmailAddress: "a@approver.com",
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
				Approvers: []*User{
					{
						EmailAddress: "a@approver.com",
					},
					{
						EmailAddress: "b@approver.com",
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
			dr := DocumentReview{
				Document: Document{
					GoogleFileID: "fileID1",
				},
				User: User{
					EmailAddress: "b@approver.com",
				},
			}
			err := dr.Get(db)
			require.NoError(err)
			assert.EqualValues(1, dr.DocumentID)
			assert.Equal("fileID1", dr.Document.GoogleFileID)
			assert.EqualValues(2, dr.UserID)
			assert.Equal("b@approver.com", dr.User.EmailAddress)
			assert.Equal(UnspecifiedDocumentReviewStatus, dr.Status)
		})

		t.Run("Update review status", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			dr := DocumentReview{
				Document: Document{
					GoogleFileID: "fileID1",
				},
				User: User{
					EmailAddress: "b@approver.com",
				},
				Status: ApprovedDocumentReviewStatus,
			}
			err := dr.Update(db)
			require.NoError(err)
			assert.EqualValues(1, dr.DocumentID)
			assert.EqualValues(2, dr.UserID)
			assert.Equal(ApprovedDocumentReviewStatus, dr.Status)
		})

		t.Run("Get the review to verify", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			dr := DocumentReview{
				Document: Document{
					GoogleFileID: "fileID1",
				},
				User: User{
					EmailAddress: "b@approver.com",
				},
			}
			err := dr.Get(db)
			require.NoError(err)
			assert.EqualValues(1, dr.DocumentID)
			assert.EqualValues(2, dr.UserID)
			assert.Equal(ApprovedDocumentReviewStatus, dr.Status)
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
				Approvers: []*User{
					{
						EmailAddress: "a@approver.com",
					},
					{
						EmailAddress: "b@approver.com",
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
				Approvers: []*User{
					{
						EmailAddress: "a@approver.com",
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
				Approvers: []*User{
					{
						EmailAddress: "b@approver.com",
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
			var revs DocumentReviews
			err := revs.Find(db, DocumentReview{})
			require.Error(err)
		})

		t.Run("Find all reviews for a document", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			var revs DocumentReviews
			err := revs.Find(db, DocumentReview{
				Document: Document{
					GoogleFileID: "fileID1",
				},
			})
			require.NoError(err)
			require.Len(revs, 2)
			assert.Equal("a@approver.com", revs[0].User.EmailAddress)
			assert.Equal("b@approver.com", revs[1].User.EmailAddress)
		})

		t.Run("Find all reviews for a user", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			var revs DocumentReviews
			err := revs.Find(db, DocumentReview{
				User: User{
					EmailAddress: "b@approver.com",
				},
			})
			require.NoError(err)
			require.Len(revs, 2)
			assert.Equal("fileID1", revs[0].Document.GoogleFileID)
			assert.Equal("fileID3", revs[1].Document.GoogleFileID)
			assert.Equal("b@approver.com", revs[0].User.EmailAddress)
			assert.Equal("b@approver.com", revs[1].User.EmailAddress)
		})
	})

	t.Run("Update review status for a document with a custom field",
		func(t *testing.T) {
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

			t.Run("Create a document type custom field",
				func(t *testing.T) {
					_, require := assert.New(t), require.New(t)

					d := DocumentTypeCustomField{
						Name: "CustomStringField",
						DocumentType: DocumentType{
							Name: "DT1",
						},
						Type: StringDocumentTypeCustomFieldType,
					}
					err := d.Upsert(db)
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
					GoogleFileID: "fileID1",
					Approvers: []*User{
						{
							EmailAddress: "a@approver.com",
						},
						{
							EmailAddress: "b@approver.com",
						},
					},
					CustomFields: []*DocumentCustomField{
						{
							DocumentTypeCustomField: DocumentTypeCustomField{
								Name: "CustomStringField",
								DocumentType: DocumentType{
									Name: "DT1",
								},
							},
							Value: "string value 1",
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

			t.Run("Update review status to approved", func(t *testing.T) {
				assert, require := assert.New(t), require.New(t)
				dr := DocumentReview{
					Document: Document{
						GoogleFileID: "fileID1",
					},
					User: User{
						EmailAddress: "b@approver.com",
					},
					Status: ApprovedDocumentReviewStatus,
				}
				err := dr.Update(db)
				require.NoError(err)
				assert.EqualValues(1, dr.DocumentID)
				assert.EqualValues(2, dr.UserID)
				assert.Equal(ApprovedDocumentReviewStatus, dr.Status)
			})
		})
}
