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
)

type ProjectRequest struct {
	ProjectName string `json:"name,omitempty"`
	TeamName    string `json:"team,omitempty"`
}

// ProjectsHandler handles the post req to add new projects from the Hermes frontend.
func ProjectsHandler(cfg *config.Config, ar *algolia.Client,
	aw *algolia.Client, db *gorm.DB, log hclog.Logger) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		// ONly allow the post requests
		if r.Method != "POST" {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}

		// Decode request.
		var req ProjectRequest
		if err := decodeRequest(r, &req); err != nil {
			log.Error("error decoding projects request", "error", err)
			http.Error(w, fmt.Sprintf("Bad request: %q", err),
				http.StatusBadRequest)
			return
		}

		// Add the data to the Postgres Database
		err := CreateNewProject(ar, aw, db, req)
		if err != nil {
			log.Error("error inserting new Projects", "error", err)
			http.Error(w, "Error inserting projects",
				http.StatusInternalServerError)
			return
		}

		// Send success response
		// Send success response with success message
		response := struct {
			Message string `json:"message"`
		}{
			Message: "New Project Inserted successfully",
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		enc := json.NewEncoder(w)
		err = enc.Encode(response)
		if err != nil {
			log.Error("error encoding projects response", "error", err)
			http.Error(w, "Error posting project",
				http.StatusInternalServerError)
			return
		}

	})
}

// Function to add new projects inside pre-existing team in the
// Database
func CreateNewProject(ar *algolia.Client,
	aw *algolia.Client, db *gorm.DB, req ProjectRequest) error {
	// Find the team with the given name in the database.
	team := &models.Team{}
	if err := db.Where("name = ?", req.TeamName).First(team).Error; err != nil {
		return fmt.Errorf("failed to find team: %w", err)
	}

	// Create a new project associated with the team.
	err := team.AddProject(db, req.ProjectName)
	if err != nil {
		return fmt.Errorf("error creating project: %w", err)
	}

	// Save the team/ Update
	if err := SaveTeam(db, team); err != nil {
		return fmt.Errorf("error saving the update team: %w", err)
	}

	return nil
}

// SaveTeam saves the updated team to the database.
func SaveTeam(db *gorm.DB, team *models.Team) error {
	if err := db.Save(team).Error; err != nil {
		return fmt.Errorf("error saving team: %w", err)
	}
	return nil
}
