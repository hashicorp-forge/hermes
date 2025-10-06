package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/pkg/workspace"
	"github.com/hashicorp/go-hclog"
	"google.golang.org/api/people/v1"
)

// PeopleDataRequest contains the fields that are allowed to
// make the POST request.
type PeopleDataRequest struct {
	Query string `json:"query,omitempty"`
}

// PeopleDataHandler returns people related data from the Google API
// to the Hermes frontend.
// PeopleDataHandler returns people related data from the Google API
// to the Hermes frontend.
func PeopleDataHandler(
	cfg *config.Config,
	log hclog.Logger,
	workspaceProvider workspace.Provider) http.Handler {

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		req := &PeopleDataRequest{}
		switch r.Method {
		// Using POST method to avoid logging the query in browser history
		// and server logs
		case "POST":
			if err := decodeRequest(r, &req); err != nil {
				log.Error("error decoding people request", "error", err)
				http.Error(w, fmt.Sprintf("Bad request: %q", err),
					http.StatusBadRequest)
				return
			}

			// Use the new SearchDirectory method for advanced people search
			results, err := workspaceProvider.SearchDirectory(workspace.PeopleSearchOptions{
				Query:   req.Query,
				Fields:  []string{"photos", "emailAddresses"},
				Sources: []string{"DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE"},
			})
			if err != nil {
				log.Error("error searching directory", "error", err, "query", req.Query)
				http.Error(w, "Error searching directory",
					http.StatusInternalServerError)
				return
			}

			// Write response
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)

			enc := json.NewEncoder(w)
			if err := enc.Encode(results); err != nil {
				log.Error("error encoding people search response", "error", err)
				http.Error(w, "Error encoding people search response",
					http.StatusInternalServerError)
				return
			}
			return
		case "GET":
			query := r.URL.Query()
			if len(query["emails"]) != 1 {
				log.Error("attempted to get users without providing any email addresses")
				http.Error(w, "Attempted to get users without providing a single value for the emails query parameter.", http.StatusBadRequest)
			} else {
				emails := strings.Split(query["emails"][0], ",")
				var peopleList []*people.Person

				// Use workspace provider's SearchPeople method
				for _, email := range emails {
					result, err := workspaceProvider.SearchPeople(email, "emailAddresses,names,photos")
					if err == nil && len(result) > 0 {
						peopleList = append(peopleList, result[0])
					} else {
						log.Warn("Email lookup miss", "error", err, "email", email)
					}
				}

				// Write response.
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusOK)

				enc := json.NewEncoder(w)
				err := enc.Encode(peopleList)
				if err != nil {
					log.Error("error encoding people response", "error", err)
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
