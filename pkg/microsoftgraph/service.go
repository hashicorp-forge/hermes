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

// Person represents a person from Microsoft Graph API
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

// SearchPeople searches for people using Microsoft Graph API
func (s *Service) SearchPeople(query string, top int) ([]Person, error) {
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

	return searchResp.Value, nil
}

// GetPersonByEmail gets a specific person by their email address
func (s *Service) GetPersonByEmail(email string) (*Person, error) {
	var getUserURL string

	// Special case for "me" to get current user
	if email == "me" {
		getUserURL = fmt.Sprintf("https://graph.microsoft.com/v1.0/me?$select=id,displayName,givenName,surname,userPrincipalName,mail,jobTitle,officeLocation,businessPhones,mobilePhone")
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

	return &person, nil
}

// GetPeopleByEmails gets multiple people by their email addresses
func (s *Service) GetPeopleByEmails(emails []string) ([]Person, error) {
	var people []Person

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
