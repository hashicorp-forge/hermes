package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/internal/structs"
	"github.com/hashicorp-forge/hermes/pkg/models"
	"github.com/hashicorp/go-hclog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// setupTestDB creates an in-memory SQLite database for testing
func setupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	// Auto-migrate the Product model
	err = db.AutoMigrate(&models.Product{})
	require.NoError(t, err)

	return db
}

func TestGetProductsData(t *testing.T) {
	t.Run("returns products from database", func(t *testing.T) {
		db := setupTestDB(t)

		// Create test products
		testProducts := []models.Product{
			{Name: "Product A", Abbreviation: "PA"},
			{Name: "Product B", Abbreviation: "PB"},
			{Name: "Product C", Abbreviation: "PC"},
		}

		for _, p := range testProducts {
			err := p.FirstOrCreate(db)
			require.NoError(t, err)
		}

		// Get products data
		result, err := getProductsData(db)
		require.NoError(t, err)

		// Verify results
		assert.Len(t, result, 3)

		// Verify Product A
		pa, ok := result["Product A"]
		assert.True(t, ok, "Product A should be in result")
		assert.Equal(t, "PA", pa.Abbreviation)
		assert.NotNil(t, pa.PerDocTypeData)
		assert.Len(t, pa.PerDocTypeData, 0, "PerDocTypeData should be empty map")

		// Verify Product B
		pb, ok := result["Product B"]
		assert.True(t, ok, "Product B should be in result")
		assert.Equal(t, "PB", pb.Abbreviation)
		assert.NotNil(t, pb.PerDocTypeData)

		// Verify Product C
		pc, ok := result["Product C"]
		assert.True(t, ok, "Product C should be in result")
		assert.Equal(t, "PC", pc.Abbreviation)
		assert.NotNil(t, pc.PerDocTypeData)
	})

	t.Run("returns empty map when no products exist", func(t *testing.T) {
		db := setupTestDB(t)

		result, err := getProductsData(db)
		require.NoError(t, err)

		assert.NotNil(t, result, "result should not be nil")
		assert.Len(t, result, 0, "result should be empty map")
	})

	t.Run("returns correct data structure format", func(t *testing.T) {
		db := setupTestDB(t)

		// Create a single product
		product := models.Product{Name: "TestProduct", Abbreviation: "TP"}
		err := product.FirstOrCreate(db)
		require.NoError(t, err)

		// Get products data
		result, err := getProductsData(db)
		require.NoError(t, err)

		// Verify structure
		assert.Len(t, result, 1)

		prodData, ok := result["TestProduct"]
		assert.True(t, ok)

		// Verify it matches the structs.ProductData structure
		assert.IsType(t, structs.ProductData{}, prodData)
		assert.Equal(t, "TP", prodData.Abbreviation)
		assert.NotNil(t, prodData.PerDocTypeData)
		assert.IsType(t, make(map[string]structs.ProductDocTypeData), prodData.PerDocTypeData)
	})
}

func TestProductsHandler(t *testing.T) {
	t.Run("GET returns products in correct format", func(t *testing.T) {
		db := setupTestDB(t)

		// Create test products
		testProducts := []models.Product{
			{Name: "Terraform", Abbreviation: "TF"},
			{Name: "Vault", Abbreviation: "VLT"},
			{Name: "Consul", Abbreviation: "CNS"},
		}

		for _, p := range testProducts {
			err := p.FirstOrCreate(db)
			require.NoError(t, err)
		}

		// Create handler
		cfg := &config.Config{}
		log := hclog.NewNullLogger()
		handler := ProductsHandler(cfg, db, log)

		// Make request
		req := httptest.NewRequest(http.MethodGet, "/api/v1/products", nil)
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		// Verify response
		assert.Equal(t, http.StatusOK, w.Code)
		assert.Equal(t, "application/json", w.Header().Get("Content-Type"))

		// Decode and verify response structure
		var response map[string]structs.ProductData
		err := json.NewDecoder(w.Body).Decode(&response)
		require.NoError(t, err)

		// Verify all products are present
		assert.Len(t, response, 3)

		// Verify Terraform
		tf, ok := response["Terraform"]
		assert.True(t, ok, "Terraform should be in response")
		assert.Equal(t, "TF", tf.Abbreviation)
		assert.NotNil(t, tf.PerDocTypeData)
		assert.IsType(t, make(map[string]structs.ProductDocTypeData), tf.PerDocTypeData)

		// Verify Vault
		vlt, ok := response["Vault"]
		assert.True(t, ok, "Vault should be in response")
		assert.Equal(t, "VLT", vlt.Abbreviation)

		// Verify Consul
		cns, ok := response["Consul"]
		assert.True(t, ok, "Consul should be in response")
		assert.Equal(t, "CNS", cns.Abbreviation)
	})

	t.Run("GET with empty database returns empty object", func(t *testing.T) {
		db := setupTestDB(t)
		cfg := &config.Config{}
		log := hclog.NewNullLogger()
		handler := ProductsHandler(cfg, db, log)

		req := httptest.NewRequest(http.MethodGet, "/api/v1/products", nil)
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]structs.ProductData
		err := json.NewDecoder(w.Body).Decode(&response)
		require.NoError(t, err)
		assert.Len(t, response, 0)
	})

	t.Run("POST method not allowed", func(t *testing.T) {
		db := setupTestDB(t)
		cfg := &config.Config{}
		log := hclog.NewNullLogger()
		handler := ProductsHandler(cfg, db, log)

		req := httptest.NewRequest(http.MethodPost, "/api/v1/products", nil)
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		assert.Equal(t, http.StatusMethodNotAllowed, w.Code)
	})

	t.Run("maintains backwards compatibility with v1 API contract", func(t *testing.T) {
		db := setupTestDB(t)

		// Create a product with the structure expected by v1 API
		product := models.Product{Name: "HashiCorp", Abbreviation: "HC"}
		err := product.FirstOrCreate(db)
		require.NoError(t, err)

		cfg := &config.Config{}
		log := hclog.NewNullLogger()
		handler := ProductsHandler(cfg, db, log)

		req := httptest.NewRequest(http.MethodGet, "/api/v1/products", nil)
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		// Verify response structure matches v1 API contract
		var response map[string]structs.ProductData
		err = json.NewDecoder(w.Body).Decode(&response)
		require.NoError(t, err)

		hc, ok := response["HashiCorp"]
		assert.True(t, ok)

		// Verify the response has all required fields from the v1 API contract
		assert.Equal(t, "HC", hc.Abbreviation, "abbreviation field must be present")
		assert.NotNil(t, hc.PerDocTypeData, "perDocTypeData field must be present")

		// PerDocTypeData should be an empty map (migration from Algolia internal index)
		// This field used to contain dynamic data like folderID and latestDocNumber
		// but is no longer populated from Algolia
		assert.Len(t, hc.PerDocTypeData, 0, "perDocTypeData should be empty map after migration")
	})
}
