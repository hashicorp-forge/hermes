package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	"github.com/hashicorp-forge/hermes/pkg/models"
	"gorm.io/gorm"

	gw "github.com/hashicorp-forge/hermes/pkg/googleworkspace"
	"github.com/hashicorp/go-hclog"
	"google.golang.org/api/people/v1"
)

// MeGetResponse mimics the response from Google's `userinfo/me` API
// (https://www.googleapis.com/userinfo/v2/me).
type MeGetResponse struct {
	ID            string `json:"id"`
	Email         string `json:"email"`
	VerifiedEmail bool   `json:"verified_email"`
	Name          string `json:"name"`
	GivenName     string `json:"given_name"`
	FamilyName    string `json:"family_name"`
	Picture       string `json:"picture"`
	Locale        string `json:"locale,omitempty"`
	HD            string `json:"hd,omitempty"`
	EmployeeID    string `json:"employee_id,omitempty"`
	Department    string `json:"department,omitempty"`
	Organization  string `json:"organization,omitempty"`
	Profile       string `json:"profile,omitempty"`
	Role          string `json:"role,omitempty"`
}

func MeHandler(
	l hclog.Logger,
	s *gw.Service,
	db *gorm.DB,
) http.Handler {

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		errResp := func(httpCode int, userErrMsg, logErrMsg string, err error) {
			l.Error(logErrMsg,
				"method", r.Method,
				"path", r.URL.Path,
				"error", err,
			)
			http.Error(w, userErrMsg, httpCode)
		}

		// Authorize request.
		userEmail := r.Context().Value("userEmail").(string)
		if userEmail == "" {
			errResp(
				http.StatusUnauthorized,
				"No authorization information for request",
				"no user email found in request context",
				nil,
			)
			return
		}

		switch r.Method {
		// The HEAD method is used to determine if the user is currently
		// authenticated.
		case "HEAD":
			w.WriteHeader(http.StatusOK)
			return

		case "GET":
			errResp := func(httpCode int, userErrMsg, logErrMsg string, err error) {
				l.Error(logErrMsg,
					"method", r.Method,
					"path", r.URL.Path,
					"error", err,
				)
				http.Error(w, userErrMsg, httpCode)
			}

			ppl, err := s.SearchPeople(userEmail, "emailAddresses,names,photos")
			if err != nil {
				errResp(
					http.StatusInternalServerError,
					"Error getting user information",
					"error searching people directory",
					err,
				)
				return
			}

			// Verify that the result only contains one person.
			if len(ppl) != 1 {
				errResp(
					http.StatusInternalServerError,
					"Error getting user information",
					fmt.Sprintf(
						"wrong number of people in search result: %d", len(ppl)),
					err,
				)
				return
			}
			p := ppl[0]

			// Make sure that the result's email address is the same as the
			// authenticated user, is the primary email address, and is verified.
			if len(p.EmailAddresses) == 0 ||
				p.EmailAddresses[0].Value != userEmail ||
				!p.EmailAddresses[0].Metadata.Primary ||
				!p.EmailAddresses[0].Metadata.Verified {
				errResp(
					http.StatusInternalServerError,
					"Error getting user information",
					"wrong user in search result",
					err,
				)
				return
			}

			// Replace the names in the People API result with data from the Admin
			// Directory API.
			// TODO: remove this when the bug in the People API is fixed:
			// https://issuetracker.google.com/issues/196235775
			if err := replaceNamesWithAdminAPIResponse(
				p, s,
			); err != nil {
				errResp(
					http.StatusInternalServerError,
					"Error getting user information",
					"error replacing names with Admin API response",
					err,
				)
				return
			}

			// Verify other required values are set.
			if len(p.Names) == 0 {
				errResp(
					http.StatusInternalServerError,
					"Error getting user information",
					"no names in result",
					err,
				)
				return
			}

			// Write response.
			resp := MeGetResponse{
				ID:            p.EmailAddresses[0].Metadata.Source.Id,
				Email:         p.EmailAddresses[0].Value,
				VerifiedEmail: p.EmailAddresses[0].Metadata.Verified,
				Name:          p.Names[0].DisplayName,
				GivenName:     p.Names[0].GivenName,
				FamilyName:    p.Names[0].FamilyName,
			}

			// fetch whether user is admin or not
			user := models.User{EmailAddress: p.EmailAddresses[0].Value}
			if resp.Role, err = user.FetchRole(db); err != nil {
				errResp(
					http.StatusInternalServerError,
					"Error getting user information",
					"error getting user role details",
					err,
				)
				return
			}

			// Get additional information from user admin api
			if err := getOtherUserInfo(
				&resp, p, s,
			); err != nil {
				errResp(
					http.StatusInternalServerError,
					"Error getting user information",
					"error getting additional info with Admin API response",
					err,
				)
				return
			}

			if len(p.Photos) > 0 {
				resp.Picture = p.Photos[0].Url
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			enc := json.NewEncoder(w)
			err = enc.Encode(resp)
			if err != nil {
				errResp(
					http.StatusInternalServerError,
					"Error getting user information",
					"error encoding response",
					err,
				)
				return
			}

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
	})
}

// Replace the names in the People API result with data from the Admin Directory
// API.
// TODO: remove this when the bug in the People API is fixed:
// https://issuetracker.google.com/issues/196235775
func replaceNamesWithAdminAPIResponse(
	p *people.Person, s *gw.Service,
) error {
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

	return nil
}

func getOtherUserInfo(
	r *MeGetResponse, p *people.Person, s *gw.Service) error {
	if len(p.EmailAddresses) == 0 {
		return errors.New("email address not found")
	}
	u, err := s.GetUser(p.EmailAddresses[0].Value)
	if err != nil {
		return fmt.Errorf("error getting user: %w", err)
	}

	for _, adminExtID := range u.ExternalIds.([]interface{}) {
		r.EmployeeID = adminExtID.(map[string]interface{})["value"].(string)
		break
	}

	for _, adminOrg := range u.Organizations.([]interface{}) {
		r.Organization = adminOrg.(map[string]interface{})["name"].(string)
		r.Department = adminOrg.(map[string]interface{})["department"].(string)
		r.Profile = adminOrg.(map[string]interface{})["title"].(string)
		break
	}

	// fetch image
	r.Picture = u.ThumbnailPhotoUrl

	return nil
}
