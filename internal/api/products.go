package api

import (
	"encoding/json"
	"net/http"

	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/internal/structs"
	"github.com/hashicorp-forge/hermes/pkg/models"
	"github.com/hashicorp/go-hclog"
	"gorm.io/gorm"
)

// ProductsHandler returns the product mappings to the Hermes frontend.
func ProductsHandler(cfg *config.Config, db *gorm.DB, log hclog.Logger) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Only allow GET requests.
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}

		// Get products and associated data from database
		products, err := getProductsData(db)
		if err != nil {
			log.Error("error getting products from database", "error", err)
			http.Error(w, "Error getting product mappings",
				http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)

		enc := json.NewEncoder(w)
		err = enc.Encode(products)
		if err != nil {
			log.Error("error encoding products response", "error", err)
			http.Error(w, "Error getting products",
				http.StatusInternalServerError)
			return
		}
	})
}

// getProductsData gets the product or area name and their associated
// data from the database.
func getProductsData(db *gorm.DB) (map[string]structs.ProductData, error) {
	var products []models.Product
	if err := db.Find(&products).Error; err != nil {
		return nil, err
	}

	// Convert database products to API response format
	result := make(map[string]structs.ProductData)
	for _, p := range products {
		result[p.Name] = structs.ProductData{
			Abbreviation: p.Abbreviation,
			// PerDocTypeData is not currently stored in the database.
			// For now, return an empty map. If needed, this can be populated
			// from the database in a future enhancement.
			PerDocTypeData: make(map[string]structs.ProductDocTypeData),
		}
	}

	return result, nil
}
