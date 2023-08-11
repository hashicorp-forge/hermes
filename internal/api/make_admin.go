package api

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/hashicorp-forge/hermes/pkg/models"
	"github.com/hashicorp/go-hclog"
	"gorm.io/gorm"
)

// MakeUserAdminHandler handles the API request to make users admin.
func MakeUserAdminHandler(log hclog.Logger, db *gorm.DB) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}

		switch r.Method {
		case "POST":
			// Decode the request to get the list of email IDs of the users to be made admins.
			var req struct {
				Emails []string `json:"emails"`
			}
			if err := decodeRequest(r, &req); err != nil {
				log.Error("error decoding make user admin request", "error", err)
				http.Error(w, fmt.Sprintf("Bad request: %q", err), http.StatusBadRequest)
				return
			}

			// Find and update each user in the list.
			for _, email := range req.Emails {
				var user models.User
				if err := db.Where("email_address = ?", email).First(&user).Error; err != nil {
					log.Error("error finding user", "error", err)
					continue // Skip to the next user if the current one is not found.
				}

				// Update the user's role to "admin" (assuming "Role" is the field in the User model that stores roles).
				user.Role = models.Admin
				if err := db.Save(&user).Error; err != nil {
					log.Error("error updating user role", "error", err)
					continue // Skip to the next user if there is an error updating the role.
				}
			}

			// Send success response with success message.
			response := struct {
				Message string `json:"message"`
			}{
				Message: "Users are now admins",
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			enc := json.NewEncoder(w)
			err := enc.Encode(response)
			if err != nil {
				log.Error("error encoding response", "error", err)
				http.Error(w, "Error encoding response", http.StatusInternalServerError)
				return
			}
		}
	})
}
