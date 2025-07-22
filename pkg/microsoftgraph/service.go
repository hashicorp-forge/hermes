package microsoftgraph

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
)

// Service represents a Microsoft Graph API service
type Service struct {
	AccessToken string
	HTTPClient  *http.Client
}

// Person represents a person from Microsoft Graph API (internal)
type Person struct {
	ID                string   `json:"id"`
	DisplayName       string   `json:"displayName"`
	GivenName         string   `json:"givenName"`
	Surname           string   `json:"surname"`
	UserPrincipalName string   `json:"userPrincipalName"`
	Mail              string   `json:"mail"`
	JobTitle          string   `json:"jobTitle"`
	OfficeLocation    string   `json:"officeLocation"`
	BusinessPhones    []string `json:"businessPhones"`
	MobilePhone       string   `json:"mobilePhone"`
}

// GooglePeoplePerson represents a person in Google People API format for frontend compatibility
type GooglePeoplePerson struct {
	EmailAddresses []EmailAddress `json:"emailAddresses"`
	Etag           string         `json:"etag"`
	Names          []Name         `json:"names"`
	Photos         []Photo        `json:"photos"`
	ResourceName   string         `json:"resourceName"`
}

type EmailAddress struct {
	Metadata EmailMetadata `json:"metadata"`
	Value    string        `json:"value"`
}

type EmailMetadata struct {
	Primary       bool   `json:"primary"`
	Source        Source `json:"source"`
	SourcePrimary bool   `json:"sourcePrimary"`
	Verified      bool   `json:"verified"`
}

type Name struct {
	DisplayName          string       `json:"displayName"`
	DisplayNameLastFirst string       `json:"displayNameLastFirst"`
	FamilyName           string       `json:"familyName"`
	GivenName            string       `json:"givenName"`
	Metadata             NameMetadata `json:"metadata"`
	UnstructuredName     string       `json:"unstructuredName"`
}

type NameMetadata struct {
	Primary       bool   `json:"primary"`
	Source        Source `json:"source"`
	SourcePrimary bool   `json:"sourcePrimary"`
}

type Photo struct {
	Default  bool          `json:"default"`
	Metadata PhotoMetadata `json:"metadata"`
	URL      string        `json:"url"`
}

type PhotoMetadata struct {
	Primary bool   `json:"primary"`
	Source  Source `json:"source"`
}

type Source struct {
	ID   string `json:"id"`
	Type string `json:"type"`
}

// SearchPeopleResponse represents the response from Microsoft Graph people search
type SearchPeopleResponse struct {
	Value []Person `json:"value"`
}

// NewService creates a new Microsoft Graph service
func NewService(accessToken string) *Service {
	return &Service{
		AccessToken: accessToken,
		HTTPClient:  &http.Client{},
	}
}

// convertToGooglePeopleFormat converts Microsoft Graph Person to Google People API format
func convertToGooglePeopleFormat(person Person) GooglePeoplePerson {
	// Use primary email (mail field) or fallback to userPrincipalName
	email := person.Mail
	if email == "" {
		email = person.UserPrincipalName
	}

	// Create display name variations
	displayName := person.DisplayName
	if displayName == "" {
		displayName = person.GivenName + " " + person.Surname
	}

	displayNameLastFirst := person.Surname + ", " + person.GivenName
	if person.Surname == "" || person.GivenName == "" {
		displayNameLastFirst = displayName
	}

	// Generate a simple etag (could be more sophisticated)
	etag := fmt.Sprintf("%%EggBAgMJLjc9PhoCAQc=%s", person.ID[:8])

	return GooglePeoplePerson{
		EmailAddresses: []EmailAddress{
			{
				Metadata: EmailMetadata{
					Primary: true,
					Source: Source{
						ID:   person.ID,
						Type: "DOMAIN_PROFILE",
					},
					SourcePrimary: true,
					Verified:      true,
				},
				Value: email,
			},
		},
		Etag: etag,
		Names: []Name{
			{
				DisplayName:          displayName,
				DisplayNameLastFirst: displayNameLastFirst,
				FamilyName:           person.Surname,
				GivenName:            person.GivenName,
				Metadata: NameMetadata{
					Primary: true,
					Source: Source{
						ID:   person.ID,
						Type: "DOMAIN_PROFILE",
					},
					SourcePrimary: true,
				},
				UnstructuredName: displayName,
			},
		},
		Photos: []Photo{
			{
				Default: true,
				Metadata: PhotoMetadata{
					Primary: true,
					Source: Source{
						ID:   person.ID,
						Type: "PROFILE",
					},
				},
				// Default Microsoft Graph photo URL - could be enhanced to fetch actual photo
				URL: "https://graph.microsoft.com/v1.0/users/" + person.ID + "/photo/$value",
			},
		},
		ResourceName: "people/" + person.ID,
	}
}

// SearchPeople searches for people using Microsoft Graph API and returns Google People API format
func (s *Service) SearchPeople(query string, top int) ([]GooglePeoplePerson, error) {
	if top <= 0 {
		top = 10 // Default limit
	}

	// Use Microsoft Graph People API to search for users
	// Documentation: https://docs.microsoft.com/en-us/graph/api/user-list
	searchURL := fmt.Sprintf("https://graph.microsoft.com/v1.0/users?$search=\"displayName:%s\" OR \"mail:%s\" OR \"userPrincipalName:%s\"&$top=%d&$select=id,displayName,givenName,surname,userPrincipalName,mail,jobTitle,officeLocation,businessPhones,mobilePhone",
		url.QueryEscape(query), url.QueryEscape(query), url.QueryEscape(query), top)

	req, err := http.NewRequest("GET", searchURL, nil)
	if err != nil {
		return nil, fmt.Errorf("error creating request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+s.AccessToken)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("ConsistencyLevel", "eventual") // Required for $search

	resp, err := s.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error making request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("microsoft Graph API returned status %d", resp.StatusCode)
	}

	var searchResp SearchPeopleResponse
	if err := json.NewDecoder(resp.Body).Decode(&searchResp); err != nil {
		return nil, fmt.Errorf("error decoding response: %w", err)
	}

	// Convert to Google People API format
	var googlePeople []GooglePeoplePerson
	for _, person := range searchResp.Value {
		googlePeople = append(googlePeople, convertToGooglePeopleFormat(person))
	}

	return googlePeople, nil
}

// GetPersonByEmail gets a specific person by their email address and returns Google People API format
func (s *Service) GetPersonByEmail(email string) (*GooglePeoplePerson, error) {
	var getUserURL string

	// Special case for "me" to get current user
	if email == "me" {
		getUserURL = "https://graph.microsoft.com/v1.0/me?$select=id,displayName,givenName,surname,userPrincipalName,mail,jobTitle,officeLocation,businessPhones,mobilePhone"
	} else {
		getUserURL = fmt.Sprintf("https://graph.microsoft.com/v1.0/users/%s?$select=id,displayName,givenName,surname,userPrincipalName,mail,jobTitle,officeLocation,businessPhones,mobilePhone",
			url.QueryEscape(email))
	}

	req, err := http.NewRequest("GET", getUserURL, nil)
	if err != nil {
		return nil, fmt.Errorf("error creating request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+s.AccessToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error making request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, nil // User not found
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("microsoft Graph API returned status %d", resp.StatusCode)
	}

	var person Person
	if err := json.NewDecoder(resp.Body).Decode(&person); err != nil {
		return nil, fmt.Errorf("error decoding response: %w", err)
	}

	// Convert to Google People API format
	googlePerson := convertToGooglePeopleFormat(person)
	return &googlePerson, nil
}

// GetPeopleByEmails gets multiple people by their email addresses and returns Google People API format
func (s *Service) GetPeopleByEmails(emails []string) ([]GooglePeoplePerson, error) {
	var people []GooglePeoplePerson

	for _, email := range emails {
		person, err := s.GetPersonByEmail(email)
		if err != nil {
			// Log error but continue with other emails
			continue
		}
		if person != nil {
			people = append(people, *person)
		}
	}

	return people, nil
}
