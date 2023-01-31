package api

import (
	"encoding/json"
	"net/http"

	"github.com/hashicorp/go-hclog"
)

type AnalyticsRequest struct {
	DocumentID  string `json:"document_id"`
	ProductName string `json:"product_name"`
}

type AnalyticsResponse struct {
	Recorded bool `json:"recorded"`
}

// Analytics handles user events for analytics
func AnalyticsHandler(log hclog.Logger) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Only allow POST requests.
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}

		decoder := json.NewDecoder(r.Body)
		var req AnalyticsRequest
		if err := decoder.Decode(&req); err != nil {
			log.Error("error decoding analytics request", "error", err)
			http.Error(w, "Error decoding analytics request",
				http.StatusBadRequest)
			return
		}

		response := &AnalyticsResponse{
			Recorded: false,
		}

		// Check if document id is set, product name is optional
		if req.DocumentID != "" {
			log.Info("document view event", "document_id", req.DocumentID, "product_name", req.ProductName)
			response.Recorded = true
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)

		enc := json.NewEncoder(w)
		err := enc.Encode(response)
		if err != nil {
			log.Error("error encoding analytics response", "error", err)
			http.Error(w, "Error encoding analytics response",
				http.StatusInternalServerError)
			return
		}
	})
}
