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

// PeopleDataHandler returns people related data from Microsoft Graph or Google
// to the Hermes frontend.
func PeopleDataHandler(srv server.Server) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case "POST":
			// Using POST method to avoid logging the query in browser history
			// and server logs
			handleSearchPeople(srv, w, r)
		case "GET":
			query := r.URL.Query()
			// Handle photo request (SharePoint only - Google uses direct photo URLs)
			if query.Get("photo") != "" && srv.SharePoint != nil {
				userEmail := query.Get("photo")
				handleGetPhoto(srv, w, userEmail)
			} else if len(query["emails"]) != 1 {
				srv.Logger.Error(
					"attempted to get users without providing any email addresses")
				http.Error(w,
					"Attempted to get users without providing a single value for the emails query parameter.",
					http.StatusBadRequest)
			} else {
				emails := strings.Split(query["emails"][0], ",")
				handleGetPeopleByEmails(srv, w, emails)
			}
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
		}
	})
}

// handleSearchPeople handles POST requests for people search.
func handleSearchPeople(srv server.Server, w http.ResponseWriter, r *http.Request) {
	req := &PeopleDataRequest{}
	if err := decodeRequest(r, &req); err != nil {
		srv.Logger.Error("error decoding people request", "error", err)
		http.Error(w, fmt.Sprintf("Bad request: %q", err),
			http.StatusBadRequest)
		return
	}

	if srv.SharePoint != nil {
		// SharePoint path: use Microsoft Graph API
		people, err := srv.SharePoint.SearchPeople(req.Query, 10)
		if err != nil {
			srv.Logger.Error("error searching people directory", "error", err)
			http.Error(w, fmt.Sprintf("Error searching people directory: %q", err),
				http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		enc := json.NewEncoder(w)
		err = enc.Encode(people)
		if err != nil {
			srv.Logger.Error("error encoding people response", "error", err)
			http.Error(w, "Error searching people directory",
				http.StatusInternalServerError)
			return
		}
	} else {
		// Google path: use Google People API
		users, err := srv.GWService.SearchPeople(
			req.Query, "emailAddresses,names,photos")
		if err != nil {
			srv.Logger.Error("error searching people directory", "error", err)
			http.Error(w, fmt.Sprintf("Error searching people directory: %q", err),
				http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		enc := json.NewEncoder(w)
		err = enc.Encode(users)
		if err != nil {
			srv.Logger.Error("error encoding people response", "error", err)
			http.Error(w, "Error searching people directory",
				http.StatusInternalServerError)
			return
		}
	}
}

// handleGetPhoto handles GET requests for profile photos (SharePoint only).
func handleGetPhoto(srv server.Server, w http.ResponseWriter, userEmail string) {
	srv.Logger.Info("Handling profile photo request", "userIdentifier", userEmail)

	photoBytes, err := srv.SharePoint.GetProfilePhoto(userEmail)
	if err != nil {
		srv.Logger.Error("Error getting profile photo", "error", err)
		placeholderSVG := getPlaceholderImageSVG(userEmail)
		w.Header().Set("Content-Type", "image/svg+xml")
		w.Header().Set("Cache-Control", "public, max-age=86400")
		w.Write([]byte(placeholderSVG))
		return
	}

	if len(photoBytes) == 0 {
		placeholderSVG := getPlaceholderImageSVG(userEmail)
		w.Header().Set("Content-Type", "image/svg+xml")
		w.Header().Set("Cache-Control", "public, max-age=86400")
		w.Write([]byte(placeholderSVG))
		return
	}

	contentType := http.DetectContentType(photoBytes)
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", "public, max-age=86400")
	w.WriteHeader(http.StatusOK)
	w.Write(photoBytes)
}

// handleGetPeopleByEmails handles GET requests for people by email addresses.
func handleGetPeopleByEmails(srv server.Server, w http.ResponseWriter, emails []string) {
	if srv.SharePoint != nil {
		// SharePoint path: use Microsoft Graph API
		people, err := srv.SharePoint.GetPeopleByEmails(emails)
		if err != nil {
			srv.Logger.Error("error getting people by emails", "error", err)
			http.Error(w, "Error getting people responses",
				http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		enc := json.NewEncoder(w)
		encodeErr := enc.Encode(people)
		if encodeErr != nil {
			srv.Logger.Error("error encoding people response", "error", encodeErr)
			http.Error(w, "Error getting people responses",
				http.StatusInternalServerError)
			return
		}
	} else {
		// Google path: use Google People API
		var people []interface{}
		for _, email := range emails {
			result, err := srv.GWService.SearchPeople(
				email, "emailAddresses,names,photos")
			if err == nil && len(result) > 0 {
				people = append(people, result[0])
			} else {
				srv.Logger.Warn("Email lookup miss", "error", err)
			}
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		enc := json.NewEncoder(w)
		err := enc.Encode(people)
		if err != nil {
			srv.Logger.Error("error encoding people response", "error", err)
			http.Error(w, "Error getting people responses",
				http.StatusInternalServerError)
			return
		}
	}
}

// getPlaceholderImageSVG returns a personalized SVG placeholder image with user's initial
func getPlaceholderImageSVG(userEmail string) string {
	// Get the first letter of the username part (before @)
	initial := "?"
	if len(userEmail) > 0 {
		// Split email by @ and use the username part
		parts := strings.Split(userEmail, "@")
		if len(parts) > 0 && len(parts[0]) > 0 {
			initial = strings.ToUpper(string(parts[0][0]))
		}
	}

	// Generate a consistent color based on the email hash
	colors := []string{
		"3b82f6", // blue-500
		"10b981", // emerald-500
		"f59e0b", // amber-500
		"ef4444", // red-500
		"8b5cf6", // violet-500
		"06b6d4", // cyan-500
		"84cc16", // lime-500
		"f97316", // orange-500
	}

	// Simple hash function to get consistent color for same email
	colorIndex := 0
	for _, char := range userEmail {
		colorIndex += int(char)
	}
	colorIndex = colorIndex % len(colors)

	return fmt.Sprintf(`<svg width="150" height="150" xmlns="http://www.w3.org/2000/svg">
		<circle cx="75" cy="75" r="75" fill="#%s"/>
		<text x="75" y="82" font-family="Arial, sans-serif" font-size="96" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">%s</text>
	</svg>`, colors[colorIndex], initial)
}
