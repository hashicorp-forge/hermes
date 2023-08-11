package models

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestProductLatestDocumentNumber(t *testing.T) {
	dsn := os.Getenv("HERMES_TEST_POSTGRESQL_DSN")
	if dsn == "" {
		t.Skip("HERMES_TEST_POSTGRESQL_DSN environment variable isn't set")
	}

	t.Run("Get and Upsert", func(t *testing.T) {
		db, tearDownTest := setupTest(t, dsn)
		defer tearDownTest(t)

		t.Run(
			"Get latest product document number which won't exist yet (should error)",
			func(t *testing.T) {
				_, require := assert.New(t), require.New(t)
				p := ProductLatestDocumentNumber{}
				err := p.Get(db)
				require.Error(err)
			})

		var product Product
		t.Run("Create a product", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			product = Product{
				Name: "product1",
			}
			err := product.FirstOrCreate(db)
			require.NoError(err)
			assert.EqualValues(1, product.ID)
			assert.Equal("product1", product.Name)
		})

		t.Run(
			"Try to upsert a new latest product document number with only a product",
			func(t *testing.T) {
				_, require := assert.New(t), require.New(t)
				p := ProductLatestDocumentNumber{
					Product: product,
				}
				err := p.Upsert(db)
				require.Error(err)
			})

		// Try to upsert a new latest product document number with only a product
		// and latest document number (should error).
		t.Run(
			"Try to upsert a new latest product document number with only a product"+
				"and latest document number",
			func(t *testing.T) {
				_, require := assert.New(t), require.New(t)
				p := ProductLatestDocumentNumber{
					Product:              product,
					LatestDocumentNumber: 5,
				}
				err := p.Upsert(db)
				require.Error(err)
			})

		var docType DocumentType
		t.Run("Create a document type", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			docType = DocumentType{
				Name:     "RFC",
			}
			err := docType.FirstOrCreate(db)
			require.NoError(err)
			assert.NotEmpty(docType.ID)
			assert.Equal("RFC", docType.Name)
		})

		t.Run("Try to upsert a new latest product document number without a latest"+
			" document number",
			func(t *testing.T) {
				_, require := assert.New(t), require.New(t)
				p := ProductLatestDocumentNumber{
					DocumentType: docType,
					Product:      product,
				}
				err := p.Upsert(db)
				require.Error(err)
			})

		t.Run("Insert by upserting a new latest product document number",
			func(t *testing.T) {
				assert, require := assert.New(t), require.New(t)
				p := ProductLatestDocumentNumber{
					DocumentType: DocumentType{
						Name: "RFC",
					},
					LatestDocumentNumber: 5,
					Product: Product{
						Name: "product1",
					},
				}
				err := p.Upsert(db)
				require.NoError(err)
				assert.NotEmpty(p.DocumentTypeID)
				assert.Equal("RFC", p.DocumentType.Name)
				assert.EqualValues(1, p.ProductID)
				assert.Equal("product1", p.Product.Name)
				assert.Equal(5, p.LatestDocumentNumber)
			})

		t.Run("Get the latest product document number", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			p := ProductLatestDocumentNumber{
				DocumentType: DocumentType{
					Name: "RFC",
				},
				Product: Product{
					Name: "product1",
				},
			}
			err := p.Get(db)
			require.NoError(err)
			assert.NotEmpty(p.DocumentTypeID)
			assert.Equal("RFC", p.DocumentType.Name)
			assert.EqualValues(1, p.ProductID)
			assert.Equal("product1", p.Product.Name)
			assert.Equal(5, p.LatestDocumentNumber)
		})

		t.Run("Update by upserting a latest product document number",
			func(t *testing.T) {
				assert, require := assert.New(t), require.New(t)
				p := ProductLatestDocumentNumber{
					DocumentType: DocumentType{
						Name: "RFC",
					},
					LatestDocumentNumber: 10,
					Product: Product{
						Name: "product1",
					},
				}
				err := p.Upsert(db)
				require.NoError(err)
				assert.NotEmpty(p.DocumentTypeID)
				assert.Equal("RFC", p.DocumentType.Name)
				assert.EqualValues(1, p.ProductID)
				assert.Equal("product1", p.Product.Name)
				assert.Equal(10, p.LatestDocumentNumber)
			})

		t.Run("Get the latest product document number", func(t *testing.T) {
			assert, require := assert.New(t), require.New(t)
			p := ProductLatestDocumentNumber{
				DocumentType: DocumentType{
					Name: "RFC",
				},
				Product: Product{
					Name: "product1",
				},
			}
			err := p.Get(db)
			require.NoError(err)
			assert.NotEmpty(p.DocumentTypeID)
			assert.Equal("RFC", p.DocumentType.Name)
			assert.EqualValues(1, p.ProductID)
			assert.Equal("product1", p.Product.Name)
			assert.Equal(10, p.LatestDocumentNumber)
		})

		t.Run(
			"Insert by upserting a new latest product document number with a "+
				"document type and product that both don't exist yet",
			func(t *testing.T) {
				assert, require := assert.New(t), require.New(t)
				p := ProductLatestDocumentNumber{
					DocumentType: DocumentType{
						Name:     "NEW",
					},
					LatestDocumentNumber: 1,
					Product: Product{
						Name: "New Product",
					},
				}
				err := p.Upsert(db)
				require.NoError(err)
				assert.NotEmpty(p.DocumentTypeID)
				assert.Equal("NEW", p.DocumentType.Name)
				assert.EqualValues(2, p.ProductID)
				assert.Equal("New Product", p.Product.Name)
				assert.Equal(1, p.LatestDocumentNumber)
			})
	})
}
