package api

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/pkg/algolia"
	"github.com/hashicorp-forge/hermes/pkg/models"
	"github.com/hashicorp/go-hclog"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type TeamRequest struct {
	TeamName         string `json:"teamName,omitempty"`
	TeamAbbreviation string `json:"teamAbbreviation,omitempty"`
	TeamBU           string `json:"teamBU,omitempty"`
}

// TeamsHandler returns the product mappings to the Hermes frontend.
func TeamsHandler(cfg *config.Config, ar *algolia.Client,
	aw *algolia.Client, db *gorm.DB, log hclog.Logger) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		switch r.Method {
		case "POST":
			// Decode request.
			var req TeamRequest
			if err := decodeRequest(r, &req); err != nil {
				log.Error("error decoding teams request", "error", err)
				http.Error(w, fmt.Sprintf("Bad request: %q", err),
					http.StatusBadRequest)
				return
			}

			// Add the data to both algolia and the Postgres Database
			err := AddNewTeams(ar, aw, db, req)
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
				Message: "Team/Pod Inserted successfully",
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			enc := json.NewEncoder(w)
			err = enc.Encode(response)

		case "GET":
			// Get products and associated data from Algolia
			products, err := getTeamsData(db)
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
func getTeamsData(db *gorm.DB) (map[string]struct {
	Abbreviation   string      `json:"abbreviation"`
	BU             string      `json:"BU"`
	PerDocTypeData interface{} `json:"perDocDataType"`
}, error) {
	var teams []models.Team

	if err := db.Preload(clause.Associations).Find(&teams).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch teams: %w", err)
	}

	teamsData := make(map[string]struct {
		Abbreviation   string      `json:"abbreviation"`
		BU             string      `json:"BU"`
		PerDocTypeData interface{} `json:"perDocDataType"`
	})

	for _, team := range teams {
		teamsData[team.Name] = struct {
			Abbreviation   string      `json:"abbreviation"`
			BU             string      `json:"BU"`
			PerDocTypeData interface{} `json:"perDocDataType"`
		}{
			Abbreviation:   team.Abbreviation,
			BU:             team.BU.Name,
			PerDocTypeData: nil,
		}
	}

	return teamsData, nil
}

// AddNewTeams This helper function adds the newly added product and upserts it
// in the postgres Database
func AddNewTeams(ar *algolia.Client,
	aw *algolia.Client, db *gorm.DB, req TeamRequest) error {
	pm := models.Team{
		Name:         req.TeamName,
		Abbreviation: req.TeamAbbreviation,
	}
	if err := pm.Upsert(db, req.TeamBU); err != nil {
		return fmt.Errorf("error upserting product: %w", err)
	}

	return nil
}
