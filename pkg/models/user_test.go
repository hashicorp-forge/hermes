package models

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestUserModel(t *testing.T) {
	dsn := os.Getenv("HERMES_TEST_POSTGRESQL_DSN")
	if dsn == "" {
		t.Skip("HERMES_TEST_POSTGRESQL_DSN environment variable isn't set")
	}

	t.Run("FirstOrCreate", func(t *testing.T) {
		assert, require := assert.New(t), require.New(t)
		db, tearDownTest := setupTest(t, dsn)
		defer tearDownTest(t)

		// Create a first user.
		u := User{
			EmailAddress: "a@a.com",
		}
		err := u.FirstOrCreate(db)
		require.NoError(err)
		assert.EqualValues(1, u.ID)
		assert.Equal("a@a.com", u.EmailAddress)

		// Get the user using FirstOrCreate.
		get := User{
			EmailAddress: "a@a.com",
		}
		err = get.FirstOrCreate(db)
		require.NoError(err)
		assert.EqualValues(1, get.ID)
		assert.Equal("a@a.com", get.EmailAddress)

		// Create a second user.
		u2 := User{
			EmailAddress: "b@b.com",
		}
		err = u2.FirstOrCreate(db)
		require.NoError(err)
		assert.EqualValues(2, u2.ID)
		assert.Equal("b@b.com", u2.EmailAddress)

		// Get the second user using FirstOrCreate.
		get2 := User{
			EmailAddress: "b@b.com",
		}
		err = get2.FirstOrCreate(db)
		require.NoError(err)
		assert.EqualValues(2, get2.ID)
		assert.Equal("b@b.com", get2.EmailAddress)
	})

	t.Run("Upsert", func(t *testing.T) {
		db, tearDownTest := setupTest(t, dsn)
		defer tearDownTest(t)

		t.Run("Create user", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			u := User{
				EmailAddress: "a@a.com",
			}
			err := u.FirstOrCreate(db)
			require.NoError(err)
			assert.EqualValues(1, u.ID)
			assert.Empty(u.RecentlyViewedDocs)
			assert.Equal("a@a.com", u.EmailAddress)
		})

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
				Name: "Product1",
			}
			err := p.FirstOrCreate(db)
			require.NoError(err)
		})

		var doc1 Document
		t.Run("Create document", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			doc1 = Document{
				GoogleFileID: "fileID1",
				DocumentType: DocumentType{
					Name: "DT1",
				},
				Product: Product{
					Name: "Product1",
				},
			}
			err := doc1.Create(db)
			require.NoError(err)
			assert.EqualValues(1, doc1.ID)
		})

		t.Run(
			"Update user to add the document as a recently viewed document",
			func(t *testing.T) {
				assert, require := assert.New(t), require.New(t)
				u := User{
					EmailAddress:       "a@a.com",
					RecentlyViewedDocs: []Document{doc1},
				}
				err := u.Upsert(db)
				require.NoError(err)
				require.Equal(1, len(u.RecentlyViewedDocs))
				assert.EqualValues(1, u.RecentlyViewedDocs[0].ID)
				assert.Equal("fileID1", u.RecentlyViewedDocs[0].GoogleFileID)
			})

		t.Run("Get the user and verify it was updated", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			u := User{
				EmailAddress: "a@a.com",
			}
			err := u.Get(db)
			require.NoError(err)
			require.Equal(1, len(u.RecentlyViewedDocs))
			assert.EqualValues(1, u.RecentlyViewedDocs[0].ID)
			assert.Equal("fileID1", u.RecentlyViewedDocs[0].GoogleFileID)
		})

		var doc2 Document
		t.Run("Create another document", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			doc2 = Document{
				GoogleFileID: "fileID2",
				DocumentType: DocumentType{
					Name: "DT1",
				},
				Product: Product{
					Name: "Product1",
				},
			}
			err := doc2.Create(db)
			require.NoError(err)
			assert.EqualValues(2, doc2.ID)
		})

		t.Run("Update user to add both documents as recently viewed documents",
			func(t *testing.T) {
				assert, require := assert.New(t), require.New(t)
				u := User{
					EmailAddress: "a@a.com",
					RecentlyViewedDocs: []Document{
						{
							GoogleFileID: "fileID1",
						},
						{
							GoogleFileID: "fileID2",
						},
					},
				}
				err := u.Upsert(db)
				require.NoError(err)
				require.Equal(2, len(u.RecentlyViewedDocs))
				assert.EqualValues(1, u.RecentlyViewedDocs[0].ID)
				assert.Equal("fileID1", u.RecentlyViewedDocs[0].GoogleFileID)
				assert.EqualValues(2, u.RecentlyViewedDocs[1].ID)
				assert.Equal("fileID2", u.RecentlyViewedDocs[1].GoogleFileID)
			})

		t.Run("Get the user and verify it was updated", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			u := User{
				EmailAddress: "a@a.com",
			}
			err := u.Get(db)
			require.NoError(err)
			require.Equal(2, len(u.RecentlyViewedDocs))
			assert.EqualValues(1, u.RecentlyViewedDocs[0].ID)
			assert.Equal("fileID1", u.RecentlyViewedDocs[0].GoogleFileID)
			assert.EqualValues(2, u.RecentlyViewedDocs[1].ID)
			assert.Equal("fileID2", u.RecentlyViewedDocs[1].GoogleFileID)
		})

		t.Run(
			"Update user to only have the second document in recently viewed documents",
			func(t *testing.T) {
				assert, require := assert.New(t), require.New(t)
				u := User{
					EmailAddress: "a@a.com",
					RecentlyViewedDocs: []Document{
						{
							GoogleFileID: "fileID2",
						},
					},
				}
				err := u.Upsert(db)
				require.NoError(err)
				require.Equal(1, len(u.RecentlyViewedDocs))
				assert.EqualValues(2, u.RecentlyViewedDocs[0].ID)
				assert.Equal("fileID2", u.RecentlyViewedDocs[0].GoogleFileID)
			})

		t.Run("Get the user and verify it was updated", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			u := User{
				EmailAddress: "a@a.com",
			}
			err := u.Get(db)
			require.NoError(err)
			require.Equal(1, len(u.RecentlyViewedDocs))
			assert.EqualValues(2, u.RecentlyViewedDocs[0].ID)
			assert.Equal("fileID2", u.RecentlyViewedDocs[0].GoogleFileID)
		})
	})

	t.Run("Product subscriptions", func(t *testing.T) {
		db, tearDownTest := setupTest(t, dsn)
		defer tearDownTest(t)

		t.Run("Create user", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			u := User{
				EmailAddress: "a@a.com",
			}
			err := u.FirstOrCreate(db)
			require.NoError(err)
			assert.EqualValues(1, u.ID)
			assert.Empty(u.RecentlyViewedDocs)
			assert.Equal("a@a.com", u.EmailAddress)
		})

		t.Run("Create a product", func(t *testing.T) {
			_, require := assert.New(t), require.New(t)
			p := Product{
				Name: "Product1",
			}
			err := p.FirstOrCreate(db)
			require.NoError(err)
			require.EqualValues(1, p.ID)
		})

		t.Run("Create a second product", func(t *testing.T) {
			_, require := assert.New(t), require.New(t)
			p := Product{
				Name: "Product2",
			}
			err := p.FirstOrCreate(db)
			require.NoError(err)
			require.EqualValues(2, p.ID)
		})

		t.Run("Get the user without any product subscriptions", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			u := User{
				EmailAddress: "a@a.com",
			}
			err := u.Get(db)
			require.NoError(err)
			assert.Len(u.ProductSubscriptions, 0)
		})

		t.Run("Update user to subscribe to the second product",
			func(t *testing.T) {
				assert, require := assert.New(t), require.New(t)
				u := User{
					EmailAddress: "a@a.com",
					ProductSubscriptions: []Product{
						{
							Name: "Product2",
						},
					},
				}
				err := u.Upsert(db)
				require.NoError(err)
				require.Equal(1, len(u.ProductSubscriptions))
				assert.EqualValues(2, u.ProductSubscriptions[0].ID)
				assert.Equal("Product2", u.ProductSubscriptions[0].Name)
			})

		t.Run("Verify with a Get",
			func(t *testing.T) {
				assert, require := assert.New(t), require.New(t)
				u := User{
					EmailAddress: "a@a.com",
				}
				err := u.Get(db)
				require.NoError(err)
				require.Equal(1, len(u.ProductSubscriptions))
				assert.EqualValues(2, u.ProductSubscriptions[0].ID)
				assert.Equal("Product2", u.ProductSubscriptions[0].Name)
			})

		t.Run("Update user to also subscribe to the first product",
			func(t *testing.T) {
				assert, require := assert.New(t), require.New(t)
				u := User{
					EmailAddress: "a@a.com",
					ProductSubscriptions: []Product{
						{
							Name: "Product1",
						},
						{
							Name: "Product2",
						},
					},
				}
				err := u.Upsert(db)
				require.NoError(err)
				require.Equal(2, len(u.ProductSubscriptions))
				assert.EqualValues(1, u.ProductSubscriptions[0].ID)
				assert.Equal("Product1", u.ProductSubscriptions[0].Name)
				assert.EqualValues(2, u.ProductSubscriptions[1].ID)
				assert.Equal("Product2", u.ProductSubscriptions[1].Name)
			})

		t.Run("Update user to only subscribe to the first product",
			func(t *testing.T) {
				assert, require := assert.New(t), require.New(t)
				u := User{
					EmailAddress: "a@a.com",
					ProductSubscriptions: []Product{
						{
							Name: "Product1",
						},
					},
				}
				err := u.Upsert(db)
				require.NoError(err)
				require.Equal(1, len(u.ProductSubscriptions))
				assert.EqualValues(1, u.ProductSubscriptions[0].ID)
				assert.Equal("Product1", u.ProductSubscriptions[0].Name)
			})
	})
}
