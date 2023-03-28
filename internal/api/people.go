package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/hashicorp-forge/hermes/internal/config"
	gw "github.com/hashicorp-forge/hermes/pkg/googleworkspace"
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
				PageSize(5).
				Query(req.Query).
				// Google API bug: "names" read mask doesn't work:
				//   https://issuetracker.google.com/issues/196235775
				ReadMask("names,photos,emailAddresses").
				Sources("DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE").
				Do()
			if err != nil {
				log.Error("error searching people directory", "error", err)
				http.Error(w, fmt.Sprintf("Error searching people directory: %q", err),
					http.StatusInternalServerError)
				return
			}

			// Replace the names in the People API result with data from the
			// Admin Directory API.
			// TODO: remove this when the bug in the People API is fixed:
			// https://issuetracker.google.com/issues/196235775
			if err := replaceNamesWithAdminAPIResponse(
				users.People, s,
			); err != nil {
				log.Error(
					"error searching people directory: error replacing names:",
					"error", err,
				)
				http.Error(w,
					"Error searching people directory",
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
						PageSize(5).
						Query(email).
						// Google API bug: "names" read mask doesn't work:
						//   https://issuetracker.google.com/issues/196235775
						ReadMask("names,photos,emailAddresses").
						Sources("DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE").
						Do()

					if err == nil && len(result.People) > 0 {
						// Replace the names in the People API result with data from the
						// Admin Directory API.
						// TODO: remove this when the bug in the People API is fixed:
						// https://issuetracker.google.com/issues/196235775
						if err := replaceNamesWithAdminAPIResponse(
							result.People, s,
						); err != nil {
							log.Error(
								"error searching people directory: error replacing names:",
								"error", err,
							)
							http.Error(w,
								"Error searching people directory",
								http.StatusInternalServerError)
							return
						}

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

// Replace the names in the People API result with data from the Admin
// Directory API.
// TODO: remove this when the bug in the People API is fixed:
// https://issuetracker.google.com/issues/196235775
func replaceNamesWithAdminAPIResponse(
	ppl []*people.Person, s *gw.Service,
) error {
	for _, p := range ppl {
		if len(p.EmailAddresses) == 0 {
			return errors.New("email address not found")
		}
		u, err := s.GetUser(p.EmailAddresses[0].Value)
		if err != nil {
			return fmt.Errorf("error getting user: %w", err)
		}

		p.Names = []*people.Name{
			{
				DisplayName: u.Name.FullName,
				FamilyName:  u.Name.FamilyName,
				GivenName:   u.Name.GivenName,
			},
		}
	}

	return nil
}
