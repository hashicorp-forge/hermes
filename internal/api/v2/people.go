package api

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	"github.com/hashicorp-forge/hermes/internal/server"
	"github.com/hashicorp-forge/hermes/pkg/microsoftgraph"
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

// processPhotoURLs updates all photo URLs in the person object to use the v2 API endpoint
// instead of direct Microsoft Graph URLs
func processPhotoURLs(person *microsoftgraph.GooglePeoplePerson) {
	if person == nil {
		return
	}

	// Extract user ID from resourceName (format: "people/ID")
	userID := strings.TrimPrefix(person.ResourceName, "people/")

	// Replace photo URLs
	for i := range person.Photos {
		// Replace with our API endpoint
		person.Photos[i].URL = fmt.Sprintf("/api/v2/people?photo=%s", url.QueryEscape(userID))
	}
}

// getProfilePhoto gets a user's profile photo using the server's credentials
func getProfilePhoto(srv server.Server, userID string) ([]byte, error) {
	// Make sure we have the SharePoint service
	if srv.SharePoint == nil {
		return nil, fmt.Errorf("SharePoint service not available")
	}

	// Try to get a token from SharePoint service
	token, err := srv.SharePoint.GetToken()
	if err != nil {
		return nil, fmt.Errorf("error getting SharePoint token: %w", err)
	}

	// Try to get the user's photo
	photoURL := fmt.Sprintf("https://graph.microsoft.com/v1.0/users/%s/photo/$value", userID)

	req, err := http.NewRequest("GET", photoURL, nil)
	if err != nil {
		return nil, fmt.Errorf("error creating request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error making request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, nil // Photo not found
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Microsoft Graph API returned status %d for photo request", resp.StatusCode)
	}

	// Read the photo data
	photoData, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error reading photo data: %w", err)
	}

	return photoData, nil
}

// getPlaceholderImageURL returns a URL for a placeholder image based on the userID
func getPlaceholderImageURL(userID string) string {
	// Get initial letter
	initial := "?"
	if len(userID) > 0 {
		initial = strings.ToUpper(userID[:1])
	}

	// Generate a consistent color based on the userID
	colors := []string{
		"0066cc", // blue
		"009933", // green
		"cc3300", // red
		"9900cc", // purple
		"cc6600", // orange
		"007a99", // teal
	}

	colorIndex := 0
	for _, r := range userID {
		colorIndex += int(r)
	}
	colorIndex = colorIndex % len(colors)

	return fmt.Sprintf("https://via.placeholder.com/150/%s/ffffff?text=%s",
		colors[colorIndex], initial)
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

			// Process photo URLs to use our API instead of direct Microsoft Graph URLs
			for i := range googlePersons {
				processPhotoURLs(&googlePersons[i])
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
			// Handle photo request
			if query.Get("photo") != "" {
				userID := query.Get("photo")
				srv.Logger.Info("Handling profile photo request", "userID", userID)

				// Use the server's credentials to get the photo
				// This doesn't require the user's token
				photoBytes, err := getProfilePhoto(srv, userID)
				if err != nil {
					srv.Logger.Error("Error getting profile photo", "error", err)
					// If we can't get the photo, return a placeholder image
					http.Redirect(w, r, getPlaceholderImageURL(userID), http.StatusTemporaryRedirect)
					return
				}

				if len(photoBytes) == 0 {
					// No photo found, return a placeholder
					http.Redirect(w, r, getPlaceholderImageURL(userID), http.StatusTemporaryRedirect)
					return
				}

				// Return the photo
				w.Header().Set("Content-Type", "image/jpeg")
				w.Header().Set("Cache-Control", "public, max-age=86400") // Cache for 24 hours
				w.WriteHeader(http.StatusOK)
				w.Write(photoBytes)
				return
			} else if len(query["emails"]) != 1 {
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

				// Process photo URLs to use our API instead of direct Microsoft Graph URLs
				for i := range googlePersons {
					processPhotoURLs(&googlePersons[i])
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
