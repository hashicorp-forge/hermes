package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/hashicorp-forge/hermes/internal/server"
	"google.golang.org/api/people/v1"
)

// PeopleDataRequest contains the fields that are allowed to
// make the POST request.
type PeopleDataRequest struct {
	Query string `json:"query,omitempty"`
}

// PeopleDataHandler returns people related data from the Google API
// to the Hermes frontend.
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

			users, err := srv.WorkspaceProvider.SearchPeople(
				req.Query,
				"emailAddresses,names,photos",
			)
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
			err = enc.Encode(users)
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
				var people []*people.Person

				for _, email := range emails {
					result, err := srv.WorkspaceProvider.SearchPeople(
						email,
						"emailAddresses,names,photos",
					)

					if err == nil && len(result) > 0 {
						people = append(people, result[0])
					} else {
						srv.Logger.Warn("Email lookup miss", "error", err)
					}
				} // Write response.
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
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
	})
}
