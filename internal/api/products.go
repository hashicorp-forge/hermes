package api

import (
	"encoding/json"
	"fmt"
	"gorm.io/gorm"
	"net/http"

	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/pkg/algolia"
	"github.com/hashicorp-forge/hermes/pkg/models"
	"github.com/hashicorp/go-hclog"
)

type ProductRequest struct {
	ProductName         string `json:"productName,omitempty"`
	ProductAbbreviation string `json:"productAbbreviation,omitempty"`
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
	Abbreviation   string      `json:"abbreviation"`
	PerDocTypeData interface{} `json:"perDocTypeData"`
}, error) {
	var products []models.Product

	if err := db.Select("name, abbreviation").Find(&products).Error; err != nil {
		return nil, err
	}

	productData := make(map[string]struct {
		Abbreviation   string      `json:"abbreviation"`
		PerDocTypeData interface{} `json:"perDocTypeData"`
	})

	for _, product := range products {
		productData[product.Name] = struct {
			Abbreviation   string      `json:"abbreviation"`
			PerDocTypeData interface{} `json:"perDocTypeData"`
		}{
			Abbreviation:   product.Abbreviation,
			PerDocTypeData: nil, // You can populate this field as needed
		}
	}

	return productData, nil
}

// AddNewProducts This helper fuction add the newly added product in both algolia and upserts it
// in the postgres Database
func AddNewProducts(ar *algolia.Client,
	aw *algolia.Client, db *gorm.DB, req ProductRequest) error {

	//// Step 1: Update the algolia object
	//var productsObj = structs.Products{
	//	ObjectID: "products",
	//	Data:     make(map[string]structs.ProductData, 0),
	//}
	//// Retrieve the existing productsObj from Algolia
	//err := ar.Internal.GetObject("products", &productsObj)
	//if err != nil {
	//	return fmt.Errorf("error retrieving existing products object from Algolia : %w", err)
	//}
	//
	//// Add the new value to the productsObj
	//productsObj.Data[req.ProductName] = structs.ProductData{
	//	Abbreviation: req.ProductAbbreviation,
	//}
	//
	//// Save the updated productsObj back to Algolia
	//// this replaces the old object completely
	//// Save Algolia products object.
	//res, err := aw.Internal.SaveObject(&productsObj)
	//if err != nil {
	//	return fmt.Errorf("error saving Algolia products object: %w", err)
	//}
	//err = res.Wait()
	//if err != nil {
	//	return fmt.Errorf("error saving Algolia products object: %w", err)
	//}

	// Step 2: upsert in the db
	pm := models.Product{
		Name:         req.ProductName,
		Abbreviation: req.ProductAbbreviation,
	}
	if err := pm.Upsert(db); err != nil {
		return fmt.Errorf("error upserting product: %w", err)
	}

	return nil
}

// Below Code uses Algolia for fetching
// ProductsHandler returns the product mappings to the Hermes frontend.
//func ProductsHandler(cfg *config.Config, ar *algolia.Client,
//	aw *algolia.Client, log hclog.Logger) http.Handler {
//	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
//		// Only allow GET requests.
//		if r.Method != http.MethodGet {
//			w.WriteHeader(http.StatusMethodNotAllowed)
//			return
//		}
//
//		// Get products and associated data from Algolia
//		products, err := getProductsData(ar)
//		if err != nil {
//			log.Error("error getting products from algolia", "error", err)
//			http.Error(w, "Error getting product mappings",
//				http.StatusInternalServerError)
//			return
//		}
//
//		w.Header().Set("Content-Type", "application/json")
//		w.WriteHeader(http.StatusOK)
//
//		enc := json.NewEncoder(w)
//		err = enc.Encode(products)
//		if err != nil {
//			log.Error("error encoding products response", "error", err)
//			http.Error(w, "Error getting products",
//				http.StatusInternalServerError)
//			return
//		}
//	})
//}
//
//// getProducts gets the product or area name and their associated
//// data from Algolia
//func getProductsData(ar *algolia.Client) (map[string]structs.ProductData, error) {
//	p := structs.Products{
//		ObjectID: "products",
//		Data:     make(map[string]structs.ProductData, 0),
//	}
//
//	err := ar.Internal.GetObject("products", &p)
//	if err != nil {
//		return nil, err
//	}
//
//	return p.Data, nil
//}
//
