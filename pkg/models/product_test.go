package models

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestProductModel(t *testing.T) {
	dsn := os.Getenv("HERMES_TEST_POSTGRESQL_DSN")
	if dsn == "" {
		t.Skip("HERMES_TEST_POSTGRESQL_DSN environment variable isn't set")
	}

	t.Run("FirstOrCreate and Get", func(t *testing.T) {
		db, tearDownTest := setupTest(t, dsn)
		defer tearDownTest(t)

		t.Run("Get a product before any exist",
			func(t *testing.T) {
				require := require.New(t)

				p := Product{
					Name: "Product1",
				}
				err := p.Get(db)
				require.Error(err)
			})

		t.Run("Create a first product", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)

			p := Product{
				Name: "Product1",
			}
			err := p.FirstOrCreate(db)
			require.NoError(err)
			assert.EqualValues(1, p.ID)
			assert.Equal("Product1", p.Name)
		})

		t.Run("Get a product without any name",
			func(t *testing.T) {
				require := require.New(t)

				p := Product{}
				err := p.Get(db)
				require.Error(err)
			})

		t.Run("Create a second product", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)

			p := Product{
				Name: "Product2",
			}
			err := p.FirstOrCreate(db)
			require.NoError(err)
			assert.EqualValues(2, p.ID)
			assert.Equal("Product2", p.Name)
		})

		t.Run("Get the first product by name using FirstOrCreate",
			func(t *testing.T) {
				assert, require := assert.New(t), require.New(t)

				p := Product{
					Name: "Product1",
				}
				err := p.FirstOrCreate(db)
				require.NoError(err)
				assert.EqualValues(1, p.ID)
				assert.Equal("Product1", p.Name)
			})

		t.Run("Get the first product by name using Get",
			func(t *testing.T) {
				assert, require := assert.New(t), require.New(t)

				p := Product{
					Name: "Product1",
				}
				err := p.Get(db)
				require.NoError(err)
				assert.EqualValues(1, p.ID)
				assert.Equal("Product1", p.Name)
			})

		t.Run("Get the first product by lowercase name using FirstOrCreate",
			func(t *testing.T) {
				assert, require := assert.New(t), require.New(t)

				p := Product{
					Name: "Product1",
				}
				err := p.FirstOrCreate(db)
				require.NoError(err)
				assert.EqualValues(1, p.ID)
				assert.Equal("Product1", p.Name)
			})

		t.Run("Get the first product by lowercase name using Get",
			func(t *testing.T) {
				assert, require := assert.New(t), require.New(t)

				p := Product{
					Name: "Product1",
				}
				err := p.Get(db)
				require.NoError(err)
				assert.EqualValues(1, p.ID)
				assert.Equal("Product1", p.Name)
			})

		t.Run("Get the second product by name using FirstOrCreate",
			func(t *testing.T) {
				assert, require := assert.New(t), require.New(t)

				p := Product{
					Name: "Product2",
				}
				err := p.FirstOrCreate(db)
				require.NoError(err)
				assert.EqualValues(2, p.ID)
				assert.Equal("Product2", p.Name)
			})

		t.Run("Get the second product by name using Get",
			func(t *testing.T) {
				assert, require := assert.New(t), require.New(t)

				p := Product{
					Name: "Product2",
				}
				err := p.Get(db)
				require.NoError(err)
				assert.EqualValues(2, p.ID)
				assert.Equal("Product2", p.Name)
			})

		t.Run("Get the first product by name and abbreviation using FirstOrCreate",
			func(t *testing.T) {
				assert, require := assert.New(t), require.New(t)

				p := Product{
					Name: "Product1",
				}
				err := p.FirstOrCreate(db)
				require.NoError(err)
				assert.EqualValues(1, p.ID)
				assert.Equal("Product1", p.Name)
			})

		t.Run("Get the first product by name and abbreviation using Get",
			func(t *testing.T) {
				assert, require := assert.New(t), require.New(t)

				p := Product{
					Name: "Product1",
				}
				err := p.Get(db)
				require.NoError(err)
				assert.EqualValues(1, p.ID)
				assert.Equal("Product1", p.Name)
			})

		t.Run(
			"Get the second product by name and wrong abbreviation using FirstOrCreate",
			func(t *testing.T) {
				assert, require := assert.New(t), require.New(t)

				p := Product{
					Name: "Product2",
				}
				err := p.FirstOrCreate(db)
				require.NoError(err)
				assert.EqualValues(2, p.ID)
				assert.Equal("Product2", p.Name)
			})

		t.Run(
			"Get the second product by name and wrong abbreviation using Get",
			func(t *testing.T) {
				assert, require := assert.New(t), require.New(t)

				p := Product{
					Name: "Product2",
				}
				err := p.Get(db)
				require.NoError(err)
				assert.EqualValues(2, p.ID)
				assert.Equal("Product2", p.Name)
			})
	})

	t.Run("FirstOrCreate bad", func(t *testing.T) {
		db, tearDownTest := setupTest(t, dsn)
		defer tearDownTest(t)

		t.Run("Create a product with an empty string for name",
			func(t *testing.T) {
				require := require.New(t)

				p := Product{
					Name: "",
				}
				err := p.FirstOrCreate(db)
				require.Error(err)
			})

		t.Run("Create a product with an empty string for abbreviation",
			func(t *testing.T) {
				require := require.New(t)

				p := Product{
					Name: "Product",
				}
				err := p.FirstOrCreate(db)
				require.Error(err)
			})
	})

	t.Run("Upsert",
		func(t *testing.T) {
			db, tearDownTest := setupTest(t, dsn)
			defer tearDownTest(t)

			t.Run("Create a product using Upsert", func(t *testing.T) {
				assert, require := assert.New(t), require.New(t)
				p := Product{
					Name: "Product1",
				}
				err := p.Upsert(db)
				require.NoError(err)
				assert.EqualValues(1, p.ID)
				assert.Equal("Product1", p.Name)
			})

			t.Run("Create a second product using Upsert", func(t *testing.T) {
				assert, require := assert.New(t), require.New(t)
				p := Product{
					Name: "Product2",
				}
				err := p.Upsert(db)
				require.NoError(err)
				assert.EqualValues(2, p.ID)
				assert.Equal("Product2", p.Name)
			})

			t.Run("Verify first product using Get", func(t *testing.T) {
				assert, require := assert.New(t), require.New(t)
				p := Product{
					Name: "Product1",
				}
				err := p.Get(db)
				require.NoError(err)
				assert.EqualValues(1, p.ID)
				assert.Equal("Product1", p.Name)
			})

			t.Run("Verify second product using Get", func(t *testing.T) {
				assert, require := assert.New(t), require.New(t)
				p := Product{
					Name: "Product2",
				}
				err := p.Get(db)
				require.NoError(err)
				assert.EqualValues(2, p.ID)
				assert.Equal("Product2", p.Name)
			})

			t.Run("Update the second product using Upsert", func(t *testing.T) {
				assert, require := assert.New(t), require.New(t)
				p := Product{
					Name: "Product2",
				}
				err := p.Upsert(db)
				require.NoError(err)
				assert.EqualValues(2, p.ID)
				assert.Equal("Product2", p.Name)
			})

			t.Run("Verify second product after update using Get", func(t *testing.T) {
				assert, require := assert.New(t), require.New(t)
				p := Product{
					Name: "Product2",
				}
				err := p.Get(db)
				require.NoError(err)
				assert.EqualValues(2, p.ID)
				assert.Equal("Product2", p.Name)
			})
		})
}
