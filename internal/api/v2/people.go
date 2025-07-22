package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/hashicorp-forge/hermes/internal/server"
)

// PeopleDataRequest contains the fields that are allowed to
// make the POST request.
type PeopleDataRequest struct {
	Query string `json:"query,omitempty"`
}

// min returns the minimum of two integers (for Go < 1.21 compatibility)
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// PeopleDataHandler returns people related data from the Microsoft Graph API
// to the Hermes frontend (converted to Google People API format for compatibility).
func PeopleDataHandler(srv server.Server) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		req := &PeopleDataRequest{}
		switch r.Method {
		// Using POST method to avoid logging the query in browser history
		// and server logs
		case "POST":
			if err := decodeRequest(r, &req); err != nil {
				srv.Logger.Error("error decoding people request", "error", err)
				http.Error(w, fmt.Sprintf("Bad request: %q", err),
					http.StatusBadRequest)
				return
			}

			// Check if Microsoft Graph service is available
			if srv.MSGraphService == nil {
				srv.Logger.Error("Microsoft Graph service not initialized")
				http.Error(w, "Microsoft Graph service not available",
					http.StatusInternalServerError)
				return
			}

			// Extract Microsoft token from request context (set by auth middleware)
			microsoftToken, ok := r.Context().Value("microsoftToken").(string)
			if !ok || microsoftToken == "" {
				srv.Logger.Error("no Microsoft access token found in request context")
				http.Error(w, "Microsoft authentication required",
					http.StatusUnauthorized)
				return
			}

			// Log the token details for debugging
			srv.Logger.Info("Using Microsoft token for People API",
				"token_length", len(microsoftToken),
				"token_prefix", microsoftToken[:min(10, len(microsoftToken))],
				"full_token", microsoftToken, // WARNING: Remove this in production!
			)

			// Set the token in the Microsoft Graph service
			srv.MSGraphService.AccessToken = microsoftToken

			// Search people using Microsoft Graph API (already in Google People API format)
			googlePersons, err := srv.MSGraphService.SearchPeople(req.Query, 10)
			if err != nil {
				srv.Logger.Error("error searching people directory", "error", err)
				http.Error(w, fmt.Sprintf("Error searching people directory: %q", err),
					http.StatusInternalServerError)
				return
			}

			// Write response.
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)

			enc := json.NewEncoder(w)
			err = enc.Encode(googlePersons)
			if err != nil {
				srv.Logger.Error("error encoding people response", "error", err)
				http.Error(w, "Error searching people directory",
					http.StatusInternalServerError)
				return
			}
		case "GET":
			query := r.URL.Query()
			if len(query["emails"]) != 1 {
				srv.Logger.Error(
					"attempted to get users without providing any email addresses")
				http.Error(w,
					"Attempted to get users without providing a single value for the emails query parameter.",
					http.StatusBadRequest)
			} else {
				emails := strings.Split(query["emails"][0], ",")

				// Check if Microsoft Graph service is available
				if srv.MSGraphService == nil {
					srv.Logger.Error("Microsoft Graph service not initialized")
					http.Error(w, "Microsoft Graph service not available",
						http.StatusInternalServerError)
					return
				}

				// Extract Microsoft token from request context (set by auth middleware)
				microsoftToken, ok := r.Context().Value("microsoftToken").(string)
				if !ok || microsoftToken == "" {
					srv.Logger.Error("no Microsoft access token found in request context")
					http.Error(w, "Microsoft authentication required",
						http.StatusUnauthorized)
					return
				}

				// Set the token in the Microsoft Graph service
				srv.MSGraphService.AccessToken = microsoftToken

				// Get people by emails using Microsoft Graph API (already in Google People API format)
				googlePersons, err := srv.MSGraphService.GetPeopleByEmails(emails)
				if err != nil {
					srv.Logger.Error("error getting people by emails", "error", err)
					http.Error(w, "Error getting people responses",
						http.StatusInternalServerError)
					return
				}

				// Write response.
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusOK)

				enc := json.NewEncoder(w)
				encodeErr := enc.Encode(googlePersons)
				if encodeErr != nil {
					srv.Logger.Error("error encoding people response", "error", encodeErr)
					http.Error(w, "Error getting people responses",
						http.StatusInternalServerError)
					return
				}
			}
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
	})
}
