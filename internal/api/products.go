package api

import (
	"encoding/json"
	"fmt"
	"net/http"

	"gorm.io/gorm"

	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/pkg/algolia"
	"github.com/hashicorp-forge/hermes/pkg/models"
	"github.com/hashicorp/go-hclog"
)

type ProductRequest struct {
	ProductName string `json:"productName,omitempty"`
}

// ProductsHandler returns the product mappings to the Hermes frontend.
func ProductsHandler(cfg *config.Config, ar *algolia.Client,
	aw *algolia.Client, db *gorm.DB, log hclog.Logger) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		switch r.Method {
		case "POST":
			// Decode request.
			var req ProductRequest
			if err := decodeRequest(r, &req); err != nil {
				log.Error("error decoding products request", "error", err)
				http.Error(w, fmt.Sprintf("Bad request: %q", err),
					http.StatusBadRequest)
				return
			}

			// Add the data to both algolia and the Postgres Database
			err := AddNewProducts(ar, aw, db, req)
			if err != nil {
				log.Error("error inserting new product/Business Unit", "error", err)
				http.Error(w, "Error inserting products",
					http.StatusInternalServerError)
				return
			}

			// Send success response
			// Send success response with success message
			response := struct {
				Message string `json:"message"`
			}{
				Message: "Product/BU Inserted successfully",
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			enc := json.NewEncoder(w)
			err = enc.Encode(response)

		case "GET":
			// Get products and associated data from Algolia
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
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
			return

		}

	})
}

// getProducts gets the product or area name and their associated
// data from Database
func getProductsData(db *gorm.DB) (map[string]struct {
	PerDocTypeData interface{} `json:"perDocTypeData"`
}, error) {
	var products []models.Product

	if err := db.Select("name").Find(&products).Error; err != nil {
		return nil, err
	}

	productData := make(map[string]struct {
		PerDocTypeData interface{} `json:"perDocTypeData"`
	})

	for _, product := range products {
		productData[product.Name] = struct {
			PerDocTypeData interface{} `json:"perDocTypeData"`
		}{
			PerDocTypeData: nil, // You can populate this field as needed
		}
	}

	return productData, nil
}

// AddNewProducts This helper fuction add the newly added product upserted in the postgres Database
func AddNewProducts(ar *algolia.Client,
	aw *algolia.Client, db *gorm.DB, req ProductRequest) error {

	// Step 1: upsert in the db
	pm := models.Product{
		Name: req.ProductName,
	}
	if err := pm.Upsert(db); err != nil {
		return fmt.Errorf("error upserting product: %w", err)
	}

	return nil
}
