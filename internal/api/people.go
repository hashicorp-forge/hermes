package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/hashicorp-forge/hermes/internal/config"
	gw "github.com/hashicorp-forge/hermes/pkg/workspace/adapters/google"
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
func PeopleDataHandler(
	cfg *config.Config,
	log hclog.Logger,
	s *gw.Service) http.Handler {

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

			users, err := s.People.SearchDirectoryPeople().
				Query(req.Query).
				// Only query for photos and email addresses
				// This may be expanded based on use case
				// in the future
				ReadMask("emailAddresses,names,photos").
				Sources("DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE").
				Do()
			if err != nil {
				log.Error("error searching people directory", "error", err)
				http.Error(w, fmt.Sprintf("Error searching people directory: %q", err),
					http.StatusInternalServerError)
				return
			}

			// Write response.
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)

			enc := json.NewEncoder(w)
			err = enc.Encode(users.People)
			if err != nil {
				log.Error("error encoding people response", "error", err)
				http.Error(w, "Error searching people directory",
					http.StatusInternalServerError)
				return
			}
		case "GET":
			query := r.URL.Query()
			if len(query["emails"]) != 1 {
				log.Error("attempted to get users without providing any email addresses")
				http.Error(w, "Attempted to get users without providing a single value for the emails query parameter.", http.StatusBadRequest)
			} else {
				emails := strings.Split(query["emails"][0], ",")
				var people []*people.Person

				for _, email := range emails {
					result, err := s.People.SearchDirectoryPeople().
						Query(email).
						ReadMask("emailAddresses,names,photos").
						Sources("DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE").
						Do()

					if err == nil && len(result.People) > 0 {
						people = append(people, result.People[0])
					} else {
						log.Warn("Email lookup miss", "error", err)
					}
				}

				// Write response.
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusOK)

				enc := json.NewEncoder(w)
				err := enc.Encode(people)
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
