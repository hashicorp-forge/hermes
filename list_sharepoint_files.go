package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"strings"
)

// SharePointAuth contains authentication details
type SharePointAuth struct {
	ClientID     string `json:"client_id"`
	ClientSecret string `json:"client_secret"`
	TenantID     string `json:"tenant_id"`
}

// TokenResponse contains the access token from Microsoft OAuth
type TokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int    `json:"expires_in"`
}

// DriveItem represents a file or folder in SharePoint
type DriveItem struct {
	ID                   string `json:"id"`
	Name                 string `json:"name"`
	WebURL               string `json:"webUrl"`
	Size                 int    `json:"size"`
	CreatedDateTime      string `json:"createdDateTime"`
	LastModifiedDateTime string `json:"lastModifiedDateTime"`
}

// DriveItemsResponse represents the response from listing files
type DriveItemsResponse struct {
	Value []DriveItem `json:"value"`
}

func main() {
	// Replace these with your actual values from configuration
	auth := SharePointAuth{
		ClientID:     "YOUR_CLIENT_ID",
		ClientSecret: "YOUR_CLIENT_SECRET",
		TenantID:     "YOUR_TENANT_ID",
	}

	// Replace these with your actual SharePoint site ID and drive ID
	siteID := "YOUR_SITE_ID"
	driveID := "YOUR_DRIVE_ID"

	// Get access token
	token, err := getAccessToken(auth)
	if err != nil {
		log.Fatalf("Error getting access token: %v", err)
	}

	// List files in the root of the drive
	listDriveItems(token, siteID, driveID, "")

	// List specific folders if needed
	listDriveItems(token, siteID, driveID, "templates")      // Replace with your folder name
	listDriveItems(token, siteID, driveID, "DraftDocuments") // Replace with your folder name
}

func getAccessToken(auth SharePointAuth) (string, error) {
	tokenURL := fmt.Sprintf("https://login.microsoftonline.com/%s/oauth2/v2.0/token", auth.TenantID)

	// Prepare request body
	reqBody := fmt.Sprintf(
		"client_id=%s&scope=https://graph.microsoft.com/.default&client_secret=%s&grant_type=client_credentials",
		auth.ClientID, auth.ClientSecret)

	// Create request
	req, err := http.NewRequest("POST", tokenURL, strings.NewReader(reqBody))
	if err != nil {
		return "", fmt.Errorf("error creating token request: %w", err)
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	// Send request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("error sending token request: %w", err)
	}
	defer resp.Body.Close()

	// Read response
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("error reading token response: %w", err)
	}

	// Parse token
	var tokenResp TokenResponse
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return "", fmt.Errorf("error parsing token response: %w", err)
	}

	return tokenResp.AccessToken, nil
}

func listDriveItems(token, siteID, driveID, folder string) {
	var url string
	if folder == "" {
		url = fmt.Sprintf("https://graph.microsoft.com/v1.0/sites/%s/drives/%s/root/children",
			siteID, driveID)
	} else {
		url = fmt.Sprintf("https://graph.microsoft.com/v1.0/sites/%s/drives/%s/root:/%s:/children",
			siteID, driveID, folder)
	}

	// Create request
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		log.Fatalf("Error creating request: %v", err)
	}

	req.Header.Set("Authorization", "Bearer "+token)

	// Send request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		log.Fatalf("Error sending request: %v", err)
	}
	defer resp.Body.Close()

	// Read response
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		log.Fatalf("Error reading response: %v", err)
	}

	// Check for errors
	if resp.StatusCode != http.StatusOK {
		log.Fatalf("Error listing items. Status: %d, Response: %s", resp.StatusCode, string(body))
	}

	// Parse items
	var itemsResp DriveItemsResponse
	if err := json.Unmarshal(body, &itemsResp); err != nil {
		log.Fatalf("Error parsing response: %v", err)
	}

	// Print items
	fmt.Printf("\nFiles in folder '%s':\n", folder)
	fmt.Printf("%-50s %-50s %s\n", "Name", "ID", "URL")
	fmt.Println(strings.Repeat("-", 120))

	for _, item := range itemsResp.Value {
		fmt.Printf("%-50s %-50s %s\n", item.Name, item.ID, item.WebURL)
	}
}
