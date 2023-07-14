package api

import (
	"encoding/json"
	"fmt"
	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/pkg/algolia"
	"github.com/hashicorp-forge/hermes/pkg/models"
	"github.com/hashicorp/go-hclog"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"net/http"
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

	// Just for printing
	//for _, team := range teams {
	//	fmt.Printf("Team ID: %d\n", team.ID)
	//	fmt.Printf("Team Name: %s\n", team.Name)
	//	fmt.Printf("Team Abbreviation: %s\n", team.Abbreviation)
	//	fmt.Printf("BU: %s\n", team.BU)
	//	// Print other columns as needed
	//	fmt.Println("-------------") // Separate each team
	//}

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

// AddNewTeams This helper function add the newly added product in both algolia and upserts it
// in the postgres Database
func AddNewTeams(ar *algolia.Client,
	aw *algolia.Client, db *gorm.DB, req TeamRequest) error {

	//// Step 1: Update the algolia object
	//var teamsObj = structs.Teams{
	//	ObjectID: "teams",
	//	Data:     make(map[string]structs.TeamData, 0),
	//}
	//// Retrieve the existing teamsObj from Algolia
	//err := ar.Internal.GetObject("teams", &teamsObj)
	//if err != nil {
	//	if algoliaErr, ok := err.(*search.); ok && algoliaErr.StatusCode == 404 {
	//		// Object does not exist, create it
	//		_, err := index.SaveObject(objectID, data)
	//		if err != nil {
	//			return fmt.Errorf("error creating object: %w", err)
	//		}
	//	} else {
	//		return fmt.Errorf("error fetching object: %w", err)
	//	}
	//} else {
	//	// Object exists, update it
	//	_, err := index.SaveObject(objectID, data)
	//	if err != nil {
	//		return fmt.Errorf("error updating object: %w", err)
	//	}
	//}
	//
	//	if err == algoli search {
	//		// Object not found, it's the first run, handle accordingly
	//		// For example, initialize the teamsObj with default values
	//		teamsObj = &structs.Teams{
	//			ObjectID: "teams",
	//			Data:     make(map[string]structs.Team, 0),
	//		}
	//	} else {
	//		// Other error occurred while retrieving the object
	//		return fmt.Errorf("error retrieving existing teams object from Algolia: %w", err)
	//	}
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
	pm := models.Team{
		Name:         req.TeamName,
		Abbreviation: req.TeamAbbreviation,
	}
	if err := pm.Upsert(db, req.TeamBU); err != nil {
		return fmt.Errorf("error upserting product: %w", err)
	}

	return nil
}
