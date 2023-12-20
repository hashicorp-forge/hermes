package models

import (
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestDocumentModel(t *testing.T) {
	dsn := os.Getenv("HERMES_TEST_POSTGRESQL_DSN")
	if dsn == "" {
		t.Skip("HERMES_TEST_POSTGRESQL_DSN environment variable isn't set")
	}

	t.Run("Create and Get", func(t *testing.T) {
		assert, require := assert.New(t), require.New(t)
		db, tearDownTest := setupTest(t, dsn)
		defer tearDownTest(t)

		// Try to create an empty document (should error).
		d := Document{}
		err := d.Create(db)
		assert.Error(err)
		assert.Empty(d.ID)

		// Create a document type.
		dt := DocumentType{
			Name:     "DT1",
			LongName: "DocumentType1",
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
		err = dt.FirstOrCreate(db)
		require.NoError(err)

		// Create a product.
		p := Product{
			Name:         "Product1",
			Abbreviation: "P1",
		}
		err = p.FirstOrCreate(db)
		require.NoError(err)

		// Create a first document with all fields.
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
			Contributors: []*User{
				{
					EmailAddress: "a@contributor.com",
				},
				{
					EmailAddress: "b@contributor.com",
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
			DocumentCreatedAt:  time.Date(2001, 1, 1, 0, 0, 0, 0, time.UTC),
			DocumentModifiedAt: time.Date(2003, 1, 1, 0, 0, 0, 0, time.UTC),
			DocumentNumber:     1,
			DocumentType: DocumentType{
				Name: "DT1",
			},
			Imported: true,
			Owner: &User{
				EmailAddress: "a@owner.com",
			},
			Product: Product{
				Name: "Product1",
			},
			Status:  InReviewDocumentStatus,
			Summary: &[]string{"test summary"}[0],
			Title:   "test title",
		}
		err = d.Create(db)

		// Create test function because we're going to reuse this for testing Get()
		// afterwards.
		testDoc1 := func(d Document) {
			require.NoError(err)
			assert.NotEmpty(d.ID)

			// GoogleFileID.
			assert.Equal("fileID1", d.GoogleFileID)

			// Approvers.
			require.Len(d.Approvers, 2)
			assert.NotEmpty(d.Approvers[0].ID)
			assert.Equal("a@approver.com", d.Approvers[0].EmailAddress)
			assert.NotEmpty(d.Approvers[1].ID)
			assert.Equal("b@approver.com", d.Approvers[1].EmailAddress)

			// Contributors.
			require.Equal(2, len(d.Contributors))
			assert.NotEmpty(d.Contributors[0].ID)
			assert.Equal("a@contributor.com", d.Contributors[0].EmailAddress)
			assert.NotEmpty(d.Contributors[1].ID)
			assert.Equal("b@contributor.com", d.Contributors[1].EmailAddress)

			// CustomFields.
			require.Len(d.CustomFields, 1)
			assert.Equal("string value 1", d.CustomFields[0].Value)

			// DocumentCreatedAt.
			assert.WithinDuration(
				time.Date(2001, 1, 1, 0, 0, 0, 0, time.UTC), d.DocumentCreatedAt, 0)

			// DocumentModifiedAt.
			assert.WithinDuration(
				time.Date(2003, 1, 1, 0, 0, 0, 0, time.UTC), d.DocumentModifiedAt, 0)

			// DocumentNumber.
			assert.Equal(1, d.DocumentNumber)

			// DocumentType.
			assert.NotEmpty(d.DocumentType.ID)
			assert.Equal("DT1", d.DocumentType.Name)
			assert.Equal("DocumentType1", d.DocumentType.LongName)

			// Imported.
			assert.Equal(true, d.Imported)

			// Owner.
			assert.NotEmpty(d.Owner.ID)
			assert.Equal("a@owner.com", d.Owner.EmailAddress)

			// Product.
			assert.NotEmpty(d.Product.ID)
			assert.Equal("Product1", d.Product.Name)
			assert.Equal("P1", d.Product.Abbreviation)

			// Status.
			assert.Equal(InReviewDocumentStatus, d.Status)

			// Summary.
			assert.Equal("test summary", *d.Summary)

			// Title.
			assert.Equal("test title", d.Title)
		}
		testDoc1(d)

		// Get the first document.
		get := Document{
			GoogleFileID: "fileID1",
		}
		err = get.Get(db)
		testDoc1(get)

		// Try creating a document with the same Google file ID (should error).
		d = Document{
			GoogleFileID: "fileID1",
			DocumentType: DocumentType{
				Name: "DT1",
			},
			Product: Product{
				Name: "Product1",
			},
		}
		err = d.Create(db)
		require.Error(err)
		assert.Empty(d.ID)

		// Create a second (minimal) document.
		d = Document{
			GoogleFileID: "fileID2",
			DocumentType: DocumentType{
				Name: "DT1",
			},
			Product: Product{
				Name: "Product1",
			},
		}
		err = d.Create(db)
		require.NoError(err)
		assert.NotEmpty(d.ID)

		// Get the second document.
		get = Document{
			GoogleFileID: "fileID2",
		}
		err = get.Get(db)
		require.NoError(err)
		assert.NotEmpty(get.ID)
		assert.Equal("fileID2", get.GoogleFileID)
		assert.NotEmpty(get.DocumentType.ID)
		assert.Equal("DT1", get.DocumentType.Name)
		assert.NotEmpty(get.Product.ID)
		assert.Equal("Product1", get.Product.Name)
	})

	t.Run("create two documents by Upsert and verify with Get",
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

			t.Run("Create a product", func(t *testing.T) {
				_, require := assert.New(t), require.New(t)
				p := Product{
					Name:         "Product1",
					Abbreviation: "P1",
				}
				err := p.FirstOrCreate(db)
				require.NoError(err)
			})

			t.Run("Create a document by upserting", func(t *testing.T) {
				assert, require := assert.New(t), require.New(t)
				d := Document{
					GoogleFileID: "fileID1",
					DocumentType: DocumentType{
						Name: "DT1",
					},
					Product: Product{
						Name: "Product1",
					},
				}
				err := d.Upsert(db)
				require.NoError(err)
				assert.EqualValues(1, d.ID)
				assert.Equal("fileID1", d.GoogleFileID)
				assert.NotEmpty(d.DocumentType.ID)
				assert.Equal("DT1", d.DocumentType.Name)
				assert.Equal("DocumentType1", d.DocumentType.LongName)
				assert.NotEmpty(d.Product.ID)
				assert.Equal("Product1", d.Product.Name)
				assert.Equal("P1", d.Product.Abbreviation)
			})

			t.Run("Create a second document by upserting", func(t *testing.T) {
				assert, require := assert.New(t), require.New(t)
				d := Document{
					GoogleFileID: "fileID2",
					DocumentType: DocumentType{
						Name: "DT1",
					},
					Product: Product{
						Name: "Product1",
					},
				}
				err := d.Upsert(db)
				require.NoError(err)
				assert.EqualValues(2, d.ID)
				assert.Equal("fileID2", d.GoogleFileID)
				assert.NotEmpty(d.DocumentType.ID)
				assert.Equal("DT1", d.DocumentType.Name)
				assert.Equal("DocumentType1", d.DocumentType.LongName)
				assert.NotEmpty(d.Product.ID)
				assert.Equal("Product1", d.Product.Name)
				assert.Equal("P1", d.Product.Abbreviation)
			})

			t.Run("Verify first document with a Get", func(t *testing.T) {
				assert, require := assert.New(t), require.New(t)
				d := Document{
					GoogleFileID: "fileID1",
				}
				err := d.Get(db)
				require.NoError(err)
				assert.EqualValues(1, d.ID)
				assert.Equal("fileID1", d.GoogleFileID)
				assert.NotEmpty(d.DocumentType.ID)
				assert.Equal("DT1", d.DocumentType.Name)
				assert.Equal("DocumentType1", d.DocumentType.LongName)
				assert.NotEmpty(d.Product.ID)
				assert.Equal("Product1", d.Product.Name)
				assert.Equal("P1", d.Product.Abbreviation)
			})

			t.Run("Verify second document with a Get", func(t *testing.T) {
				assert, require := assert.New(t), require.New(t)
				d := Document{
					GoogleFileID: "fileID2",
				}
				err := d.Get(db)
				require.NoError(err)
				assert.EqualValues(2, d.ID)
				assert.Equal("fileID2", d.GoogleFileID)
				assert.NotEmpty(d.DocumentType.ID)
				assert.Equal("DT1", d.DocumentType.Name)
				assert.Equal("DocumentType1", d.DocumentType.LongName)
				assert.NotEmpty(d.Product.ID)
				assert.Equal("Product1", d.Product.Name)
				assert.Equal("P1", d.Product.Abbreviation)
			})
		})

	t.Run("Upsert contributors", func(t *testing.T) {
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

		t.Run("Create a document without contributors by upserting",
			func(t *testing.T) {
				assert, require := assert.New(t), require.New(t)
				d := Document{
					GoogleFileID: "fileID1",
					DocumentType: DocumentType{
						Name:     "DT1",
						LongName: "DocumentType1",
					},
					Product: Product{
						Name:         "Product1",
						Abbreviation: "P1",
					},
				}
				err := d.Upsert(db)
				require.NoError(err)
				assert.EqualValues(1, d.ID)
				assert.Equal("fileID1", d.GoogleFileID)
				assert.Empty(d.Contributors)
			})

		t.Run("Add two contributors by upserting", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			d := Document{
				GoogleFileID: "fileID1",
				Contributors: []*User{
					{
						EmailAddress: "a@contributor.com",
					},
					{
						EmailAddress: "b@contributor.com",
					},
				},
			}
			err := d.Upsert(db)
			require.NoError(err)
			assert.EqualValues(1, d.ID)
			assert.Equal("fileID1", d.GoogleFileID)
			require.Len(d.Contributors, 2)
			assert.NotEmpty(d.Contributors[0].ID)
			assert.Equal("a@contributor.com", d.Contributors[0].EmailAddress)
			assert.NotEmpty(d.Contributors[1].ID)
			assert.Equal("b@contributor.com", d.Contributors[1].EmailAddress)
		})

		t.Run("Verify with Get", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			d := Document{
				GoogleFileID: "fileID1",
			}
			err := d.Get(db)
			require.NoError(err)
			assert.EqualValues(1, d.ID)
			assert.Equal("fileID1", d.GoogleFileID)
			require.Len(d.Contributors, 2)
			assert.NotEmpty(d.Contributors[0].ID)
			assert.Equal("a@contributor.com", d.Contributors[0].EmailAddress)
			assert.NotEmpty(d.Contributors[1].ID)
			assert.Equal("b@contributor.com", d.Contributors[1].EmailAddress)
		})

		t.Run("Update to only the second contributor", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			d := Document{
				GoogleFileID: "fileID1",
				Contributors: []*User{
					{
						EmailAddress: "b@contributor.com",
					},
				},
			}
			err := d.Upsert(db)
			require.NoError(err)
			assert.EqualValues(1, d.ID)
			assert.Equal("fileID1", d.GoogleFileID)
			require.Equal(1, len(d.Contributors))
			assert.NotEmpty(d.Contributors[0].ID)
			assert.Equal("b@contributor.com", d.Contributors[0].EmailAddress)
		})
	})

	// TODO: should we allow this?
	/*
		t.Run("Upsert Owner", func(t *testing.T) {
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

			t.Run("Create a document by Upsert", func(t *testing.T) {
				assert, require := assert.New(t), require.New(t)
				d := Document{
					GoogleFileID: "fileID1",
					DocumentType: DocumentType{
						Name:     "DT1",
						LongName: "DocumentType1",
					},
					Owner: &User{
						EmailAddress: "a@a.com",
					},
					Product: Product{
						Name:         "Product1",
						Abbreviation: "P1",
					},
				}
				err := d.Upsert(db)
				require.NoError(err)
				assert.EqualValues(1, d.ID)
				assert.Equal("fileID1", d.GoogleFileID)
				assert.Equal("a@a.com", d.Owner.EmailAddress)
			})

			t.Run("Get the document", func(t *testing.T) {
				assert, require := assert.New(t), require.New(t)
				d := Document{
					GoogleFileID: "fileID1",
				}
				err := d.Get(db)
				require.NoError(err)
				assert.EqualValues(1, d.ID)
				assert.Equal("fileID1", d.GoogleFileID)
				assert.Equal("a@a.com", d.Owner.EmailAddress)
			})

			t.Run("Update the Owner field by Upsert", func(t *testing.T) {
				assert, require := assert.New(t), require.New(t)
				d := Document{
					GoogleFileID: "fileID1",
					Owner: &User{
						EmailAddress: "b@b.com",
					},
				}
				err := d.Upsert(db)
				require.NoError(err)
				assert.EqualValues(1, d.ID)
				assert.Equal("fileID1", d.GoogleFileID)
				assert.Equal("b@b.com", d.Owner.EmailAddress)
			})

			t.Run("Get the document after upserting", func(t *testing.T) {
				assert, require := assert.New(t), require.New(t)
				d := Document{
					GoogleFileID: "fileID1",
				}
				err := d.Get(db)
				require.NoError(err)
				assert.EqualValues(1, d.ID)
				assert.Equal("fileID1", d.GoogleFileID)
				assert.Equal("b@b.com", d.Owner.EmailAddress)
			})

			t.Run("Update the Owner field back to first value by Upsert", func(t *testing.T) {
				assert, require := assert.New(t), require.New(t)
				d := Document{
					GoogleFileID: "fileID1",
					Owner: &User{
						EmailAddress: "a@a.com",
					},
				}
				err := d.Upsert(db)
				require.NoError(err)
				assert.EqualValues(1, d.ID)
				assert.Equal("fileID1", d.GoogleFileID)
				assert.Equal("a@a.com", d.Owner.EmailAddress)
			})

			t.Run("Get the document after upserting", func(t *testing.T) {
				assert, require := assert.New(t), require.New(t)
				d := Document{
					GoogleFileID: "fileID1",
				}
				err := d.Get(db)
				require.NoError(err)
				assert.EqualValues(1, d.ID)
				assert.Equal("fileID1", d.GoogleFileID)
				assert.Equal("a@a.com", d.Owner.EmailAddress)
			})
		})
	*/

	t.Run("Upsert Summary", func(t *testing.T) {
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

		t.Run("Create a document by Upsert", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			d := Document{
				Approvers: []*User{
					{
						EmailAddress: "a@approver.com",
					},
					{
						EmailAddress: "b@approver.com",
					},
				},
				GoogleFileID: "fileID1",
				DocumentType: DocumentType{
					Name:     "DT1",
					LongName: "DocumentType1",
				},
				Product: Product{
					Name:         "Product1",
					Abbreviation: "P1",
				},
				Summary: &[]string{"summary1"}[0],
			}
			err := d.Upsert(db)
			require.NoError(err)
			assert.EqualValues(1, d.ID)
			assert.Equal("fileID1", d.GoogleFileID)
			assert.Equal("summary1", *d.Summary)
		})

		t.Run("Get the document", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			d := Document{
				GoogleFileID: "fileID1",
			}
			err := d.Get(db)
			require.NoError(err)
			assert.EqualValues(1, d.ID)
			assert.Equal("fileID1", d.GoogleFileID)
			assert.Equal("summary1", *d.Summary)
		})

		t.Run("Update the Summary field by Upsert", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			d := Document{
				GoogleFileID: "fileID1",
				Summary:      &[]string{"summary2"}[0],
			}
			err := d.Upsert(db)
			require.NoError(err)
			assert.EqualValues(1, d.ID)
			assert.Equal("fileID1", d.GoogleFileID)
			assert.Equal("summary2", *d.Summary)
		})

		t.Run("Get the document", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			d := Document{
				GoogleFileID: "fileID1",
			}
			err := d.Get(db)
			require.NoError(err)
			assert.EqualValues(1, d.ID)
			assert.Equal("fileID1", d.GoogleFileID)
			assert.Equal("summary2", *d.Summary)
		})

		t.Run("Update the Summary field to an empty string by Upsert",
			func(t *testing.T) {
				assert, require := assert.New(t), require.New(t)
				d := Document{
					GoogleFileID: "fileID1",
					Summary:      &[]string{""}[0],
				}
				err := d.Upsert(db)
				require.NoError(err)
				assert.EqualValues(1, d.ID)
				assert.Equal("fileID1", d.GoogleFileID)
				assert.Equal("", *d.Summary)
			})

		t.Run("Get the document", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			d := Document{
				GoogleFileID: "fileID1",
			}
			err := d.Get(db)
			require.NoError(err)
			assert.EqualValues(1, d.ID)
			assert.Equal("fileID1", d.GoogleFileID)
			assert.Equal("", *d.Summary)
		})
	})

	t.Run("Update Product field using Upsert", func(t *testing.T) {
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

		t.Run("Create a document by Upsert", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			d := Document{
				GoogleFileID: "fileID1",
				DocumentType: DocumentType{
					Name:     "DT1",
					LongName: "DocumentType1",
				},
				Product: Product{
					Name: "Product1",
				},
			}
			err := d.Upsert(db)
			require.NoError(err)
			assert.EqualValues(1, d.ID)
			assert.Equal("fileID1", d.GoogleFileID)
			assert.Equal("Product1", d.Product.Name)
			assert.Equal("P1", d.Product.Abbreviation)
			assert.EqualValues(1, d.Product.ID)
		})

		t.Run("Get the document", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			d := Document{
				GoogleFileID: "fileID1",
			}
			err := d.Get(db)
			require.NoError(err)
			assert.EqualValues(1, d.ID)
			assert.Equal("fileID1", d.GoogleFileID)
			assert.Equal("Product1", d.Product.Name)
			assert.Equal("P1", d.Product.Abbreviation)
			assert.EqualValues(1, d.Product.ID)
		})

		t.Run("Create a second product", func(t *testing.T) {
			_, require := assert.New(t), require.New(t)
			p := Product{
				Name:         "Product2",
				Abbreviation: "P2",
			}
			err := p.FirstOrCreate(db)
			require.NoError(err)
		})

		t.Run("Update the Product field by Upsert", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			d := Document{
				GoogleFileID: "fileID1",
				Product: Product{
					Name: "Product2",
				},
			}
			err := d.Upsert(db)
			require.NoError(err)
			assert.EqualValues(1, d.ID)
			assert.Equal("fileID1", d.GoogleFileID)
			assert.Equal("Product2", d.Product.Name)
			assert.Equal("P2", d.Product.Abbreviation)
			assert.EqualValues(2, d.Product.ID)
		})

		t.Run("Get the document", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			d := Document{
				GoogleFileID: "fileID1",
			}
			err := d.Get(db)
			require.NoError(err)
			assert.EqualValues(1, d.ID)
			assert.Equal("fileID1", d.GoogleFileID)
			assert.Equal("Product2", d.Product.Name)
			assert.Equal("P2", d.Product.Abbreviation)
			assert.EqualValues(2, d.Product.ID)
		})
	})

	t.Run("Upsert a document with custom fields", func(t *testing.T) {
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

		t.Run("Create a second document type", func(t *testing.T) {
			_, require := assert.New(t), require.New(t)
			dt := DocumentType{
				Name:     "DT2",
				LongName: "DocumentType2",
			}
			err := dt.FirstOrCreate(db)
			require.NoError(err)
		})

		t.Run("Create a custom field for the second document type",
			func(t *testing.T) {
				_, require := assert.New(t), require.New(t)

				d := DocumentTypeCustomField{
					Name: "CustomStringFieldDT2",
					DocumentType: DocumentType{
						Name: "DT2",
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

		t.Run("Create a document using Upsert", func(t *testing.T) {
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
							Name: "CustomStringFieldDT2",
							DocumentType: DocumentType{
								Name: "DT2",
							},
						},
						Value: "string value 1",
					},
				},
				DocumentType: DocumentType{
					Name: "DT2",
				},
				Product: Product{
					Name: "Product1",
				},
			}
			err := d.Upsert(db)
			require.NoError(err)
			assert.EqualValues(1, d.ID)
			require.Len(d.CustomFields, 1)
			assert.Equal("CustomStringFieldDT2",
				d.CustomFields[0].DocumentTypeCustomField.Name)
			assert.Equal("DT2",
				d.CustomFields[0].DocumentTypeCustomField.DocumentType.Name)
			assert.Equal("string value 1", d.CustomFields[0].Value)
		})

		t.Run("Get the document", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			d := Document{
				GoogleFileID: "fileID1",
			}
			err := d.Get(db)
			require.NoError(err)
			assert.EqualValues(1, d.ID)
			require.Len(d.CustomFields, 1)
			assert.Equal("CustomStringFieldDT2",
				d.CustomFields[0].DocumentTypeCustomField.Name)
			assert.Equal("DT2",
				d.CustomFields[0].DocumentTypeCustomField.DocumentType.Name)
			assert.Equal("string value 1", d.CustomFields[0].Value)
		})
	})

	t.Run("Create, get, and delete a draft document",
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
					Status: WIPDocumentStatus,
				}
				err := d.Create(db)
				require.NoError(err)
				assert.EqualValues(1, d.ID)
			})

			t.Run("Get the document", func(t *testing.T) {
				assert, require := assert.New(t), require.New(t)
				d := Document{
					GoogleFileID: "GoogleFileID1",
				}
				err := d.Get(db)
				require.NoError(err)
				assert.EqualValues(1, d.ID)
				assert.False(d.DeletedAt.Valid)
			})

			t.Run("Delete a document", func(t *testing.T) {
				assert, require := assert.New(t), require.New(t)

				d := Document{
					GoogleFileID: "GoogleFileID1",
				}
				err := d.Delete(db)
				require.NoError(err)
				assert.True(d.DeletedAt.Valid)
			})
		})
}

func TestGetLatestProductNumber(t *testing.T) {
	dsn := os.Getenv("HERMES_TEST_POSTGRESQL_DSN")
	if dsn == "" {
		t.Skip("HERMES_TEST_POSTGRESQL_DSN environment variable isn't set")
	}
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

	t.Run("Get latest product number without any documents", func(t *testing.T) {
		assert, require := assert.New(t), require.New(t)

		num, err := GetLatestProductNumber(db, "DT1", "Product1")
		require.NoError(err)
		assert.Equal(0, num)
	})

	t.Run("Create a document", func(t *testing.T) {
		assert, require := assert.New(t), require.New(t)

		d := Document{
			GoogleFileID: "fileID1",
			DocumentType: DocumentType{
				Name: "DT1",
			},
			Product: Product{
				Name: "Product1",
			},
			DocumentNumber: 4,
		}
		err := d.Create(db)
		require.NoError(err)
		assert.EqualValues(1, d.ID)
	})

	t.Run("Get latest product number", func(t *testing.T) {
		assert, require := assert.New(t), require.New(t)

		num, err := GetLatestProductNumber(db, "DT1", "Product1")
		require.NoError(err)
		assert.Equal(4, num)
	})

	t.Run("Create another document", func(t *testing.T) {
		assert, require := assert.New(t), require.New(t)

		d := Document{
			GoogleFileID: "fileID2",
			DocumentType: DocumentType{
				Name: "DT1",
			},
			Product: Product{
				Name: "Product1",
			},
			DocumentNumber: 42,
		}
		err := d.Create(db)
		require.NoError(err)
		assert.EqualValues(2, d.ID)
	})

	t.Run("Get latest product number", func(t *testing.T) {
		assert, require := assert.New(t), require.New(t)

		num, err := GetLatestProductNumber(db, "DT1", "Product1")
		require.NoError(err)
		assert.Equal(42, num)
	})

	t.Run("Create a second document type", func(t *testing.T) {
		_, require := assert.New(t), require.New(t)

		dt := DocumentType{
			Name:     "DT2",
			LongName: "DocumentType2",
		}
		err := dt.FirstOrCreate(db)
		require.NoError(err)
	})

	t.Run("Create a document of the same product and second document type",
		func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)

			d := Document{
				GoogleFileID: "fileID3",
				DocumentType: DocumentType{
					Name: "DT2",
				},
				Product: Product{
					Name: "Product1",
				},
				DocumentNumber: 2,
			}
			err := d.Create(db)
			require.NoError(err)
			assert.EqualValues(3, d.ID)
		})

	t.Run("Get latest product number", func(t *testing.T) {
		assert, require := assert.New(t), require.New(t)

		num, err := GetLatestProductNumber(db, "DT2", "Product1")
		require.NoError(err)
		assert.Equal(2, num)
	})
}

func TestDocumentGetProjects(t *testing.T) {
	dsn := os.Getenv("HERMES_TEST_POSTGRESQL_DSN")
	if dsn == "" {
		t.Skip("HERMES_TEST_POSTGRESQL_DSN environment variable isn't set")
	}

	t.Run("Get and Replace", func(t *testing.T) {
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
			require.EqualValues(1, d.ID)

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
			require.EqualValues(2, d.ID)

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
			require.EqualValues(3, d.ID)
		})

		t.Run("Create projects", func(t *testing.T) {
			_, require := assert.New(t), require.New(t)
			p := Project{
				Creator: User{
					EmailAddress: "a@a.com",
				},
				Title: "Title1",
			}
			err := p.Create(db)
			require.NoError(err)
			require.EqualValues(1, p.ID)

			p = Project{
				Creator: User{
					EmailAddress: "a@a.com",
				},
				Title: "Title2",
			}
			err = p.Create(db)
			require.NoError(err)
			require.EqualValues(2, p.ID)

			p = Project{
				Creator: User{
					EmailAddress: "a@a.com",
				},
				Title: "Title3",
			}
			err = p.Create(db)
			require.NoError(err)
			require.EqualValues(3, p.ID)
		})

		t.Run("Replace related resources for project 1", func(t *testing.T) {
			_, require := assert.New(t), require.New(t)
			p := Project{
				Model: gorm.Model{
					ID: 1,
				},
			}
			err := p.ReplaceRelatedResources(db,
				[]ProjectRelatedResourceExternalLink{
					{
						RelatedResource: ProjectRelatedResource{
							ProjectID: 1,
							SortOrder: 1,
						},
						Name: "Name1",
						URL:  "URL1",
					},
				},
				[]ProjectRelatedResourceHermesDocument{
					{
						RelatedResource: ProjectRelatedResource{
							ProjectID: 1,
							SortOrder: 2,
						},
						Document: Document{
							GoogleFileID: "GoogleFileID1",
						},
					},
				},
			)
			require.NoError(err)
		})

		t.Run("Replace related resources for project 2", func(t *testing.T) {
			_, require := assert.New(t), require.New(t)
			p := Project{
				Model: gorm.Model{
					ID: 2,
				},
			}
			err := p.ReplaceRelatedResources(db,
				[]ProjectRelatedResourceExternalLink{
					{
						RelatedResource: ProjectRelatedResource{
							ProjectID: 2,
							SortOrder: 1,
						},
						Name: "Name1",
						URL:  "URL1",
					},
				},
				[]ProjectRelatedResourceHermesDocument{
					{
						RelatedResource: ProjectRelatedResource{
							ProjectID: 2,
							SortOrder: 2,
						},
						Document: Document{
							GoogleFileID: "GoogleFileID1",
						},
					},
					{
						RelatedResource: ProjectRelatedResource{
							ProjectID: 2,
							SortOrder: 3,
						},
						Document: Document{
							GoogleFileID: "GoogleFileID2",
						},
					},
					{
						RelatedResource: ProjectRelatedResource{
							ProjectID: 2,
							SortOrder: 4,
						},
						Document: Document{
							GoogleFileID: "GoogleFileID3",
						},
					},
				},
			)
			require.NoError(err)
		})

		t.Run("Replace related resources for project 3", func(t *testing.T) {
			_, require := assert.New(t), require.New(t)
			p := Project{
				Model: gorm.Model{
					ID: 3,
				},
			}
			err := p.ReplaceRelatedResources(db,
				[]ProjectRelatedResourceExternalLink{
					{
						RelatedResource: ProjectRelatedResource{
							ProjectID: 3,
							SortOrder: 1,
						},
						Name: "Name1",
						URL:  "URL1",
					},
				},
				[]ProjectRelatedResourceHermesDocument{
					{
						RelatedResource: ProjectRelatedResource{
							ProjectID: 3,
							SortOrder: 2,
						},
						Document: Document{
							GoogleFileID: "GoogleFileID1",
						},
					},
					{
						RelatedResource: ProjectRelatedResource{
							ProjectID: 3,
							SortOrder: 3,
						},
						Document: Document{
							GoogleFileID: "GoogleFileID3",
						},
					},
				},
			)
			require.NoError(err)
		})

		t.Run("Get projects for document 1", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			d := Document{
				GoogleFileID: "GoogleFileID1",
			}
			projs, err := d.GetProjects(db)
			require.NoError(err)
			require.Len(projs, 3)
			assert.Equal("Title1", projs[0].Title)
			assert.Equal("Title2", projs[1].Title)
			assert.Equal("Title3", projs[2].Title)
		})

		t.Run("Get projects for document 2", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			d := Document{
				GoogleFileID: "GoogleFileID2",
			}
			projs, err := d.GetProjects(db)
			require.NoError(err)
			require.Len(projs, 1)
			assert.Equal("Title2", projs[0].Title)
		})

		t.Run("Get projects for document 3", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			d := Document{
				GoogleFileID: "GoogleFileID3",
			}
			projs, err := d.GetProjects(db)
			require.NoError(err)
			require.Len(projs, 2)
			assert.Equal("Title2", projs[0].Title)
			assert.Equal("Title3", projs[1].Title)
		})
	})
}

func TestDocumentReplaceRelatedResources(t *testing.T) {
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

		t.Run("Add external link related resources", func(t *testing.T) {
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

			rr = DocumentRelatedResourceExternalLink{
				RelatedResource: DocumentRelatedResource{
					Document: Document{
						GoogleFileID: "GoogleFileID2",
					},
					SortOrder: 2,
				},
				Name: "Name2",
				URL:  "URL2",
			}
			err = rr.Create(db)
			require.NoError(err)

			rr = DocumentRelatedResourceExternalLink{
				RelatedResource: DocumentRelatedResource{
					Document: Document{
						GoogleFileID: "GoogleFileID2",
					},
					SortOrder: 3,
				},
				Name: "Name3",
				URL:  "URL3",
			}
			err = rr.Create(db)
			require.NoError(err)
		})

		t.Run("Get the document", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			d := Document{
				GoogleFileID: "GoogleFileID2",
			}
			err := d.Get(db)
			require.NoError(err)
			assert.Len(d.RelatedResources, 3)
		})

		t.Run("Replace related resources", func(t *testing.T) {
			_, require := assert.New(t), require.New(t)
			d := Document{
				GoogleFileID: "GoogleFileID2",
			}
			err := d.ReplaceRelatedResources(db,
				[]DocumentRelatedResourceExternalLink{
					{
						RelatedResource: DocumentRelatedResource{
							Document: Document{
								GoogleFileID: "GoogleFileID2",
							},
							SortOrder: 1,
						},
						Name: "Name4",
						URL:  "URL4",
					},
				},
				[]DocumentRelatedResourceHermesDocument{
					{
						RelatedResource: DocumentRelatedResource{
							Document: Document{
								GoogleFileID: "GoogleFileID2",
							},
							SortOrder: 2,
						},
						Document: Document{
							GoogleFileID: "GoogleFileID1",
						},
					},
					{
						RelatedResource: DocumentRelatedResource{
							Document: Document{
								GoogleFileID: "GoogleFileID2",
							},
							SortOrder: 3,
						},
						Document: Document{
							GoogleFileID: "GoogleFileID3",
						},
					},
				},
			)
			require.NoError(err)
		})

		t.Run("Get the document", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			d := Document{
				GoogleFileID: "GoogleFileID2",
			}
			err := d.Get(db)
			require.NoError(err)
			assert.Len(d.RelatedResources, 3)
		})

		t.Run("Get typed related resources", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			d := Document{
				GoogleFileID: "GoogleFileID2",
			}
			elrrs, hdrrs, err := d.GetRelatedResources(db)
			require.NoError(err)
			assert.Len(elrrs, 1)
			assert.Equal("Name4", elrrs[0].Name)
			assert.Equal("URL4", elrrs[0].URL)
			assert.Equal(1, elrrs[0].RelatedResource.SortOrder)
			assert.Len(hdrrs, 2)
			assert.Equal("GoogleFileID1", hdrrs[0].Document.GoogleFileID)
			assert.Equal(2, hdrrs[0].RelatedResource.SortOrder)
			assert.Equal("GoogleFileID3", hdrrs[1].Document.GoogleFileID)
			assert.Equal(3, hdrrs[1].RelatedResource.SortOrder)
		})
	})
}
