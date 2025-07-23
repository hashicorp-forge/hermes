package api

import (
	"encoding/json"
	// "fmt"
	"net/http"
	"strings"

	"github.com/hashicorp-forge/hermes/internal/server"
	"github.com/hashicorp-forge/hermes/pkg/microsoftgraph"
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
}

func MeHandler(srv server.Server) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		errResp := func(httpCode int, userErrMsg, logErrMsg string, err error) {
			srv.Logger.Error(logErrMsg,
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
			// Extract Microsoft token from request context for logging
			microsoftToken, hasMicrosoftToken := r.Context().Value("microsoftToken").(string)

			srv.Logger.Info("me handler called",
				"method", r.Method,
				"path", r.URL.Path,
				"user_email", userEmail,
				"has_microsoft_token", hasMicrosoftToken,
				"microsoft_token_length", len(microsoftToken),
			)

			// Check if Microsoft Graph service is available and we have a token
			if srv.MSGraphService == nil {
				srv.Logger.Error("Microsoft Graph service not initialized")
				http.Error(w, "Microsoft Graph service not available",
					http.StatusInternalServerError)
				return
			}

			if !hasMicrosoftToken || microsoftToken == "" {
				srv.Logger.Error("no Microsoft access token found in request context")
				http.Error(w, "Microsoft authentication required",
					http.StatusUnauthorized)
				return
			}

			// Set the token in the Microsoft Graph service
			srv.MSGraphService.AccessToken = microsoftToken

			// Get current user's profile from Microsoft Graph API
			profile, err := srv.MSGraphService.GetPersonByEmail("me")
			if err != nil {
				srv.Logger.Error("error getting user profile from Microsoft Graph",
					"error", err,
					"user_email", userEmail,
				)
				// Fall back to mock data if Microsoft Graph fails
				srv.Logger.Info("falling back to mock user data due to Microsoft Graph error")
				profile = &microsoftgraph.GooglePeoplePerson{
					ResourceName: "people/fallback-user-" + userEmail,
					Names: []microsoftgraph.Name{
						{
							DisplayName: "Development User",
							GivenName:   "Development",
							FamilyName:  "User",
							Metadata: microsoftgraph.NameMetadata{
								Primary: true,
							},
						},
					},
					EmailAddresses: []microsoftgraph.EmailAddress{
						{
							Value: userEmail,
							Metadata: microsoftgraph.EmailMetadata{
								Primary:  true,
								Verified: true,
							},
						},
					},
				}
			}

			// Extract data from Google People API format
			var userID, email, displayName, givenName, familyName string

			// Get primary email
			for _, emailAddr := range profile.EmailAddresses {
				if emailAddr.Metadata.Primary {
					email = emailAddr.Value
					break
				}
			}
			if email == "" && len(profile.EmailAddresses) > 0 {
				email = profile.EmailAddresses[0].Value
			}

			// Get primary name
			for _, name := range profile.Names {
				if name.Metadata.Primary {
					displayName = name.DisplayName
					givenName = name.GivenName
					familyName = name.FamilyName
					break
				}
			}
			if displayName == "" && len(profile.Names) > 0 {
				displayName = profile.Names[0].DisplayName
				givenName = profile.Names[0].GivenName
				familyName = profile.Names[0].FamilyName
			}

			// Extract user ID from resource name (format: "people/ID")
			userID = strings.TrimPrefix(profile.ResourceName, "people/")

			// Convert Microsoft Graph profile to Google userinfo format
			resp := MeGetResponse{
				ID:            userID,
				Email:         email,
				VerifiedEmail: true, // Assume verified since authenticated via Microsoft
				Name:          displayName,
				GivenName:     givenName,
				FamilyName:    familyName,
				Picture:       profile.Photos[0].URL, 
				Locale:        "en",
			}

			// Extract domain from email for HD field (hosted domain)
			if resp.Email != "" {
				parts := strings.Split(resp.Email, "@")
				if len(parts) > 1 {
					resp.HD = parts[1]
				}
			}

			srv.Logger.Info("returning Microsoft Graph user data",
				"user_id", resp.ID,
				"user_name", resp.Name,
				"user_email", resp.Email,
			)

			// Write response.
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			enc := json.NewEncoder(w)
			err = enc.Encode(resp)
			if err != nil {
				srv.Logger.Error("error encoding user response",
					"error", err,
					"method", r.Method,
					"path", r.URL.Path,
				)
				http.Error(w, "Error getting user information", http.StatusInternalServerError)
				return
			}

			// Original Google Workspace implementation (commented out for development)
			/*
				errResp := func(
					httpCode int, userErrMsg, logErrMsg string, err error,
					extraArgs ...interface{}) {
					srv.Logger.Error(logErrMsg,
						append([]interface{}{
							"error", err,
							"method", r.Method,
							"path", r.URL.Path,
						}, extraArgs...)...,
					)
					http.Error(w, userErrMsg, httpCode)
				}

				ppl, err := srv.GWService.SearchPeople(
					userEmail, "emailAddresses,names,photos")
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
						nil,
						"user_email", userEmail,
					)

					// If configured, send an email to the user to notify them that their
					// account was not found in the directory.
					if srv.Config.Email != nil && srv.Config.Email.Enabled &&
						srv.Config.GoogleWorkspace != nil &&
						srv.Config.GoogleWorkspace.UserNotFoundEmail != nil &&
						srv.Config.GoogleWorkspace.UserNotFoundEmail.Enabled &&
						srv.Config.GoogleWorkspace.UserNotFoundEmail.Body != "" &&
						srv.Config.GoogleWorkspace.UserNotFoundEmail.Subject != "" {
						_, err = srv.GWService.SendEmail(
							[]string{userEmail},
							srv.Config.Email.FromAddress,
							srv.Config.GoogleWorkspace.UserNotFoundEmail.Subject,
							srv.Config.GoogleWorkspace.UserNotFoundEmail.Body,
						)
						if err != nil {
							srv.Logger.Error("error sending user not found email",
								"error", err,
								"method", r.Method,
								"path", r.URL.Path,
								"user_email", userEmail,
							)
						} else {
							srv.Logger.Info("user not found email sent",
								"method", r.Method,
								"path", r.URL.Path,
								"user_email", userEmail,
							)
						}
					}

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
			*/

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
	})
}
