package sharepointhelper

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// ErrUserNotFound is returned when a user is not found (404 from Graph API)
var ErrUserNotFound = errors.New("user not found")

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

// People represents a person for frontend compatibility
type People struct {
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

// convertToPeopleFormat converts Microsoft Graph Person to People format
func convertToPeopleFormat(person Person) People {
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

	return People{
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
				URL: fmt.Sprintf("/api/v2/people?photo=%s&v=%d", url.QueryEscape(email), time.Now().Unix()),
			},
		},
		ResourceName: "people/" + person.ID,
	}
}

// SearchPeople searches for people using Microsoft Graph API and returns People format
func (s *Service) SearchPeople(query string, top int) ([]People, error) {
	if top <= 0 {
		top = 10
	}
	rawQuery := query

	// Escape any embedded double quotes in user input (Graph expects balanced quotes)
	escapedUser := strings.ReplaceAll(rawQuery, `"`, `\"`)

	// Build the search clause (three OR terms). Each term is quoted per Graph $search syntax.
	searchClause := fmt.Sprintf(`"displayName:%s" OR "mail:%s" OR "userPrincipalName:%s"`, escapedUser, escapedUser, escapedUser)

	// URL-encode the entire clause exactly once
	searchParam := url.QueryEscape(searchClause)

	searchURL := fmt.Sprintf(
		"https://graph.microsoft.com/v1.0/users?$search=%s&$top=%d&$select=id,displayName,givenName,surname,userPrincipalName,mail,jobTitle,officeLocation,businessPhones,mobilePhone",
		searchParam, top,
	)

	s.Logger.Debug("people search request",
		"url", searchURL,
		"raw_query", rawQuery,
		"search_clause", searchClause,
	)

	options := &APIOptions{
		Headers: map[string]string{
			"ConsistencyLevel": "eventual",
			"Content-Type":     "application/json",
		},
	}

	resp, err := s.InvokeAPIWithOptions("GET", searchURL, nil, options)
	if err != nil {
		return nil, fmt.Errorf("error making request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API returned status %d: %s", resp.StatusCode, string(body))
	}

	var searchResp SearchPeopleResponse
	if err := json.NewDecoder(resp.Body).Decode(&searchResp); err != nil {
		return nil, fmt.Errorf("error decoding response: %w", err)
	}

	var people []People
	for _, person := range searchResp.Value {
		people = append(people, convertToPeopleFormat(person))
	}
	return people, nil
}

// GetPersonByEmail gets a specific person by their email address and returns People format
func (s *Service) GetPersonByEmail(email string) (*Person, error) {
	var getUserURL string

	// Special case for "me" to get current user
	if email == "me" {
		getUserURL = "https://graph.microsoft.com/v1.0/me?$select=id,displayName,givenName,surname,userPrincipalName,mail,jobTitle,officeLocation,businessPhones,mobilePhone"
	} else {
		getUserURL = fmt.Sprintf("https://graph.microsoft.com/v1.0/users/%s?$select=id,displayName,givenName,surname,userPrincipalName,mail,jobTitle,officeLocation,businessPhones,mobilePhone",
			url.QueryEscape(email))
	}

	options := &APIOptions{
		Headers: map[string]string{
			"Content-Type": "application/json",
		},
	}

	resp, err := s.InvokeAPIWithOptions("GET", getUserURL, nil, options)
	if err != nil {
		return nil, fmt.Errorf("error calling Graph API to get person by email: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, ErrUserNotFound
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("microsoft Graph API returned status %d", resp.StatusCode)
	}

	var person Person
	if err := json.NewDecoder(resp.Body).Decode(&person); err != nil {
		return nil, fmt.Errorf("error decoding response: %w", err)
	}

	return &person, nil
}

// GetPeopleByEmails gets multiple people by their email addresses and returns People format
func (s *Service) GetPeopleByEmails(emails []string) ([]People, error) {
	var people []People

	for _, email := range emails {
		person, err := s.GetPersonByEmail(email)
		if err != nil {
			// Log error but continue with other emails
			continue
		}
		if person != nil {
			personRecord := convertToPeopleFormat(*person)
			people = append(people, personRecord)
		}
	}

	return people, nil
}

// GetProfilePhoto gets a user's profile photo using Microsoft Graph API
// Accepts either email address or user ID
func (s *Service) GetProfilePhoto(userEmail string) ([]byte, error) {
	// Try to get a token
	token, err := s.GetToken()
	if err != nil {
		return nil, fmt.Errorf("error getting token: %w", err)
	}

	photoURL := fmt.Sprintf("https://graph.microsoft.com/v1.0/users/%s/photo/$value", url.QueryEscape(userEmail))

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
		return nil, fmt.Errorf("API returned status %d for photo request", resp.StatusCode)
	}

	// Read the photo data
	photoData, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error reading photo data: %w", err)
	}

	return photoData, nil
}
