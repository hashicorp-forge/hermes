package api

import (
	"encoding/json"
	"net/http"

	"github.com/hashicorp-forge/hermes/internal/server"
	"github.com/hashicorp-forge/hermes/internal/structs"
	"github.com/hashicorp-forge/hermes/pkg/algolia"
)

// ProductsHandler returns the product mappings to the Hermes frontend.
func ProductsHandler(srv server.Server) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Only allow GET requests.
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}

		// Get products and associated data from Algolia
		products, err := getProductsData(srv.AlgoSearch)
		if err != nil {
			srv.Logger.Error("error getting products from algolia", "error", err)
			http.Error(w, "Error getting product mappings",
				http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)

		enc := json.NewEncoder(w)
		err = enc.Encode(products)
		if err != nil {
			srv.Logger.Error("error encoding products response", "error", err)
			http.Error(w, "Error getting products",
				http.StatusInternalServerError)
			return
		}
	})
}

// getProducts gets the product or area name and their associated
// data from Algolia
func getProductsData(a *algolia.Client) (
	map[string]structs.ProductData, error,
) {
	p := structs.Products{
		ObjectID: "products",
		Data:     make(map[string]structs.ProductData, 0),
	}

	err := a.Internal.GetObject("products", &p)
	if err != nil {
		return nil, err
	}

	return p.Data, nil
}
