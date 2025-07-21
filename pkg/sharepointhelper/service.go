package sharepointhelper

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

type Service struct {
	AccessToken  string
	ClientID     string
	ClientSecret string
	TenantID     string
	SiteID       string // Add SiteID if not already present
	DriveID      string // Add DriveID to the struct
}

type GraphResponse struct {
	Mail string `json:"mail"`
	User string `json:"userPrincipalName"`
}

// Document represents a SharePoint document fetched via the Microsoft Graph API.
type Document struct {
	ID               string `json:"id"`
	Name             string `json:"name"`
	LastModifiedTime string `json:"lastModifiedDateTime"`
	Size             int64  `json:"size"`
	WebURL           string `json:"webUrl"`
	FileExtension    string `json:"fileExtension"`
}

const tokenFile = "sharepoint_token.json"

// ValidateToken validates the SharePoint access token by calling the Microsoft Graph API.
func (s *Service) ValidateToken(token string) (string, error) {
	// Remove "Bearer " prefix if present
	token = strings.TrimPrefix(token, "Bearer ")

	// Call the Microsoft Graph API to validate the token
	url := "https://graph.microsoft.com/v1.0/me"
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	// Check if the response status is 200 OK
	if resp.StatusCode != http.StatusOK {
		return "", errors.New("invalid token or unauthorized access")
	}

	// Parse the response to extract the user's email
	var graphResp GraphResponse
	if err := json.NewDecoder(resp.Body).Decode(&graphResp); err != nil {
		return "", err
	}

	// Return the user's email (prefer `mail`, fallback to `userPrincipalName`)
	if graphResp.Mail != "" {
		return graphResp.Mail, nil
	}
	if graphResp.User != "" {
		return graphResp.User, nil
	}

	return "", errors.New("unable to extract user email from token")
}

// saveTokenToFile saves the token and its expiry to a file.
func saveTokenToFile(token string, expiry time.Time) error {
	data := map[string]string{
		"token":  token,
		"expiry": expiry.Format(time.RFC3339),
	}
	file, err := os.Create(tokenFile)
	if err != nil {
		return err
	}
	defer file.Close()
	return json.NewEncoder(file).Encode(data)
}

// loadTokenFromFile loads the token and its expiry from a file.
func loadTokenFromFile() (string, time.Time, error) {
	file, err := os.Open(tokenFile)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return "", time.Time{}, nil // File doesn't exist
		}
		return "", time.Time{}, err
	}
	defer file.Close()

	data := map[string]string{}
	if err := json.NewDecoder(file).Decode(&data); err != nil {
		return "", time.Time{}, err
	}

	token := data["token"]
	expiry, err := time.Parse(time.RFC3339, data["expiry"])
	if err != nil {
		return "", time.Time{}, err
	}

	return token, expiry, nil
}

// getNewToken generates a new SharePoint token.
func (s *Service) getNewToken() (string, time.Time, error) {
	tokenURL := fmt.Sprintf("https://login.microsoftonline.com/%s/oauth2/v2.0/token", s.TenantID)
	data := map[string]string{
		"grant_type":    "client_credentials",
		"client_id":     s.ClientID,
		"client_secret": s.ClientSecret,
		"scope":         "https://graph.microsoft.com/.default",
	}

	form := make(map[string][]string)
	for k, v := range data {
		form[k] = []string{v}
	}

	resp, err := http.PostForm(tokenURL, form)
	if err != nil {
		return "", time.Time{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", time.Time{}, fmt.Errorf("failed to get token: %s", resp.Status)
	}

	var result struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", time.Time{}, err
	}

	expiry := time.Now().Add(time.Duration(result.ExpiresIn) * time.Second)
	return result.AccessToken, expiry, nil
}

// GetToken manages the SharePoint token lifecycle.
func (s *Service) GetToken() (string, error) {
	// Load token from file
	token, expiry, err := loadTokenFromFile()
	if err != nil {
		return "", fmt.Errorf("error loading SharePoint token: %w", err)
	}

	// Check if token is still valid
	if token != "" && time.Now().Before(expiry) {
		return token, nil
	}

	// Generate a new token
	token, expiry, err = s.getNewToken()
	if err != nil {
		return "", fmt.Errorf("error generating new SharePoint token: %w", err)
	}

	// Save the new token to file
	if err := saveTokenToFile(token, expiry); err != nil {
		return "", fmt.Errorf("error saving SharePoint token: %w", err)
	}

	return token, nil
}

func (s *Service) FetchDocuments(driveID, folderID string, after, before time.Time) ([]Document, error) {
	// Construct the Microsoft Graph API URL to list all items in the folder
	url := fmt.Sprintf(
		"https://graph.microsoft.com/v1.0/sites/%s/drives/%s/root:/%s:/children",
		s.SiteID,
		driveID,
		folderID,
	)

	// Log the constructed URL
	fmt.Printf("Request URL: %s\n", url)

	// Create the HTTP request
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("error creating request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+s.AccessToken)

	// Execute the request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error making request to SharePoint: %w", err)
	}
	defer resp.Body.Close()

	// Log the response status
	fmt.Printf("Response Status: %s\n", resp.Status)

	// Check for a successful response
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to fetch documents: %s, %s", resp.Status, string(body))
	}

	// Parse the response
	var result struct {
		Value []Document `json:"value"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("error decoding response: %w", err)
	}

	// Filter files programmatically based on lastModifiedDateTime
	var filteredDocuments []Document
	for _, item := range result.Value {
		// Check if the item is a file and has a valid lastModifiedDateTime
		if item.LastModifiedTime != "" && item.FileExtension != "" {
			lastModified, err := time.Parse(time.RFC3339, item.LastModifiedTime)
			if err != nil {
				fmt.Printf("Skipping item '%s' due to invalid lastModifiedDateTime: %v\n", item.Name, err)
				continue
			}
			// Filter files within the specified date range
			if lastModified.After(after) && lastModified.Before(before) {
				filteredDocuments = append(filteredDocuments, item)
			}
		}
	}

	return filteredDocuments, nil
}

func (s *Service) DownloadContent(fileID string) ([]byte, error) {
	// Construct the Microsoft Graph API URL for file content
	url := fmt.Sprintf("https://graph.microsoft.com/v1.0/sites/%s/drives/%s/items/%s/content", s.TenantID, s.ClientID, fileID)

	// Create the HTTP request
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("error creating request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+s.AccessToken)

	// Execute the request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error making request to SharePoint: %w", err)
	}
	defer resp.Body.Close()

	// Check for a successful response
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to download content: %s", resp.Status)
	}

	// Read the response body
	content, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error reading response body: %w", err)
	}

	return content, nil
}
