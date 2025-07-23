package microsoftgraph

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// DriveItem represents a file or folder in Microsoft OneDrive/SharePoint
type DriveItem struct {
	ID                   string `json:"id"`
	Name                 string `json:"name"`
	WebURL               string `json:"webUrl"`
	CreatedDateTime      string `json:"createdDateTime"`
	LastModifiedDateTime string `json:"lastModifiedDateTime"`
	ParentReference      struct {
		DriveID   string `json:"driveId"`
		DriveType string `json:"driveType"`
		ID        string `json:"id"`
	} `json:"parentReference"`
}

// CopyFile copies a file in Microsoft SharePoint/OneDrive using Microsoft Graph API
func (s *Service) CopyFile(fileID, name, destFolderID string) (*DriveItem, error) {
	// Create the request body
	requestBody := map[string]interface{}{
		"name":            name,
		"parentReference": map[string]interface{}{},
	}

	// Add driveId to parentReference only if explicitly provided in destFolderID
	// Otherwise use the service's DriveID
	if s.DriveID != "" {
		requestBody["parentReference"].(map[string]interface{})["driveId"] = s.DriveID
	}

	// Handle destination folder specification
	if destFolderID != "" {
		// Check if destFolderID is a path rather than an ID
		if !strings.Contains(destFolderID, "-") && !strings.Contains(destFolderID, "!") {
			// Assume it's a folder path, use path format
			requestBody["parentReference"].(map[string]interface{})["path"] = "/drive/root:/" + destFolderID
		} else {
			// It's an ID, use it directly
			requestBody["parentReference"].(map[string]interface{})["id"] = destFolderID
		}
	}

	// Marshal the request body to JSON
	jsonBody, err := json.Marshal(requestBody)
	if err != nil {
		return nil, fmt.Errorf("error marshaling request body: %w", err)
	}

	// Log the request body for debugging
	fmt.Printf("Request body: %s\n", string(jsonBody))
	fmt.Printf("File ID: %s, Dest Folder ID: %s\n", fileID, destFolderID)

	// Construct the URL for the copy operation - use the drive ID from service
	var copyURL string
	if s.SiteID != "" && s.DriveID != "" {
		// Use site and drive if available
		copyURL = fmt.Sprintf("https://graph.microsoft.com/v1.0/sites/%s/drives/%s/items/%s/copy",
			url.PathEscape(s.SiteID), url.PathEscape(s.DriveID), url.PathEscape(fileID))
	} else if s.DriveID != "" {
		// Fallback to drive direct access
		copyURL = fmt.Sprintf("https://graph.microsoft.com/v1.0/drives/%s/items/%s/copy",
			url.PathEscape(s.DriveID), url.PathEscape(fileID))
	} else {
		// If no drive specified, use "me" endpoint
		copyURL = fmt.Sprintf("https://graph.microsoft.com/v1.0/me/drive/items/%s/copy",
			url.PathEscape(fileID))
	}

	fmt.Printf("copyURL= %s\n", copyURL)

	// Create the HTTP request
	req, err := http.NewRequest("POST", copyURL, bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("error creating request: %w", err)
	}

	// Set headers
	req.Header.Set("Authorization", "Bearer "+s.AccessToken)
	req.Header.Set("Content-Type", "application/json")

	// Execute the request
	resp, err := s.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error making request to microsoft graph: %w", err)
	}
	defer resp.Body.Close()
	fmt.Printf("copy-req executed\n")

	// Check the response status
	if resp.StatusCode != http.StatusAccepted && resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)

		// Parse error response for better diagnostics
		var errorResp struct {
			Error struct {
				Code       string `json:"code"`
				Message    string `json:"message"`
				InnerError struct {
					Date            string `json:"date"`
					RequestID       string `json:"request-id"`
					ClientRequestID string `json:"client-request-id"`
				} `json:"innerError"`
			} `json:"error"`
		}
		fmt.Printf("status code checked\n")

		_ = json.Unmarshal(bodyBytes, &errorResp)

		if errorResp.Error.Code != "" {
			return nil, fmt.Errorf("microsoft graph api error: code=%s message=%s requestID=%s: %s",
				errorResp.Error.Code, errorResp.Error.Message,
				errorResp.Error.InnerError.RequestID, string(bodyBytes))
		}
		fmt.Printf("resp error code\n")

		return nil, fmt.Errorf("microsoft graph api returned status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	// For asynchronous operations, Microsoft Graph returns a monitor URL
	// in the Location header that we need to poll to get the result
	if resp.StatusCode == http.StatusAccepted {
		fmt.Printf("monitor URL code block\n")
		itemID := resp.Header.Get("Location")
		// Remove query parameters if any exist
		if queryIndex := strings.Index(itemID, "?"); queryIndex != -1 {
			itemID = itemID[:queryIndex]
		}
		// Extract the last path segment (after the last slash)
		if lastSlashIndex := strings.LastIndex(itemID, "/"); lastSlashIndex != -1 {
			itemID = itemID[lastSlashIndex+1:]
		}
		fmt.Printf("itemID is this %s\n", itemID)
		var monitorURL = fmt.Sprintf("https://graph.microsoft.com/v1.0/sites/%s/drives/%s/items/%s",
			url.PathEscape(s.SiteID), url.PathEscape(s.DriveID), url.PathEscape(itemID))
		if monitorURL == "" {
			return nil, fmt.Errorf("no monitor URL returned for async operation")
		}

		// Poll the monitor URL until the operation completes
		fmt.Printf("polling started \n")
		driveItem, err := s.pollOperationStatus(monitorURL)
		if err != nil {
			fmt.Printf("polling error \n")
			return nil, fmt.Errorf("error monitoring copy operation: %w", err)
		}
		fmt.Printf("polling ended \n")
		return driveItem, nil
	}

	// If the operation completed synchronously, parse the response directly
	fmt.Printf("parse directly flow\n")
	var driveItem DriveItem
	if err := json.NewDecoder(resp.Body).Decode(&driveItem); err != nil {
		return nil, fmt.Errorf("error decoding response: %w", err)
	}

	return &driveItem, nil
}

// pollOperationStatus polls a monitor URL until an operation completes
func (s *Service) pollOperationStatus(monitorURL string) (*DriveItem, error) {
	maxRetries := 10
	retryDelay := 1 * time.Second

	for i := 0; i < maxRetries; i++ {
		// Wait before polling
		time.Sleep(retryDelay)

		// Create the request to check status
		req, err := http.NewRequest("GET", monitorURL, nil)
		if err != nil {
			return nil, fmt.Errorf("error creating monitor request: %w", err)
		}
		req.Header.Set("Authorization", "Bearer "+s.AccessToken)
		fmt.Printf("header set \n")

		fmt.Printf("-------------------")
		fmt.Printf("monitorURL = %s \n", monitorURL)
		fmt.Printf("s.AccessToken = %s \n", s.AccessToken)
		fmt.Printf("-------------------")

		// Execute the request
		resp, err := s.HTTPClient.Do(req)
		if err != nil {
			return nil, fmt.Errorf("error making monitor request: %w", err)
		}
		fmt.Printf("request executed \n")

		// Read the response body
		bodyBytes, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			return nil, fmt.Errorf("error reading monitor response: %w", err)
		}
		fmt.Printf("response body read \n")

		// Check for completion
		if resp.StatusCode == http.StatusOK {
			var driveItem DriveItem
			if err := json.Unmarshal(bodyBytes, &driveItem); err != nil {
				return nil, fmt.Errorf("error parsing completed operation response: %w", err)
			}
			fmt.Printf("comp ret \n")
			return &driveItem, nil
		}
		fmt.Printf("comp check \n")

		// If still in progress, parse the monitor response
		var monitorResponse struct {
			Status       string `json:"status"`
			ResourceID   string `json:"resourceId"`
			StatusCode   int    `json:"statusCode"`
			ErrorCode    string `json:"errorCode"`
			ErrorMessage string `json:"errorMessage"`
		}
		fmt.Printf("parse done \n")

		if err := json.Unmarshal(bodyBytes, &monitorResponse); err != nil {
			return nil, fmt.Errorf("error parsing monitor response: %w", err)
		}

		// Check for errors or completion
		fmt.Printf("monitorResponse.Status= %s \n", monitorResponse.Status)
		fmt.Printf("bodyBytes= %s \n", bodyBytes)
		switch monitorResponse.Status {
		case "completed":
			fmt.Printf("monitor completed \n")
			// If completed, make one more request to get the item details
			if monitorResponse.ResourceID != "" {
				itemURL := fmt.Sprintf("https://graph.microsoft.com/v1.0/sites/%s/drives/%s/items/%s",
					url.PathEscape(s.SiteID), url.PathEscape(s.DriveID), monitorResponse.ResourceID)
				return s.getDriveItem(itemURL)
			}
		case "failed":
			fmt.Printf("monitor failed \n")
			return nil, fmt.Errorf("operation failed: %s - %s", monitorResponse.ErrorCode, monitorResponse.ErrorMessage)
		}

		// Increase retry delay with exponential backoff
		retryDelay = retryDelay * 2
	}

	return nil, fmt.Errorf("operation timed out after %d retries", maxRetries)
}

// getDriveItem fetches a drive item by its URL
func (s *Service) getDriveItem(itemURL string) (*DriveItem, error) {
	req, err := http.NewRequest("GET", itemURL, nil)
	if err != nil {
		return nil, fmt.Errorf("error creating item request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+s.AccessToken)

	resp, err := s.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error making item request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("error getting item, status: %d", resp.StatusCode)
	}

	var driveItem DriveItem
	if err := json.NewDecoder(resp.Body).Decode(&driveItem); err != nil {
		return nil, fmt.Errorf("error decoding item response: %w", err)
	}

	return &driveItem, nil
}

// MoveFile moves a file to a different folder in OneDrive/SharePoint
func (s *Service) MoveFile(fileID, destFolderID string) (*DriveItem, error) {
	// Create the request body
	requestBody := map[string]interface{}{
		"parentReference": map[string]interface{}{
			"driveId": s.DriveID,
			"id":      destFolderID,
		},
	}

	// Marshal the request body to JSON
	jsonBody, err := json.Marshal(requestBody)
	if err != nil {
		return nil, fmt.Errorf("error marshaling request body: %w", err)
	}

	// Log the request body for debugging
	fmt.Printf("Move request body: %s\n", string(jsonBody))
	fmt.Printf("Move File ID: %s, Dest Folder ID: %s\n", fileID, destFolderID)

	// Construct the URL for the move operation (PATCH to update the parent)
	var moveURL string
	if s.SiteID != "" && s.DriveID != "" {
		// Use site and drive if available
		moveURL = fmt.Sprintf("https://graph.microsoft.com/v1.0/sites/%s/drives/%s/items/%s",
			url.PathEscape(s.SiteID), url.PathEscape(s.DriveID), url.PathEscape(fileID))
	} else {
		// Fallback to drive direct access
		moveURL = fmt.Sprintf("https://graph.microsoft.com/v1.0/drives/%s/items/%s",
			url.PathEscape(s.DriveID), url.PathEscape(fileID))
	}

	// Create the HTTP request
	req, err := http.NewRequest("PATCH", moveURL, bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("error creating request: %w", err)
	}

	// Set headers
	req.Header.Set("Authorization", "Bearer "+s.AccessToken)
	req.Header.Set("Content-Type", "application/json")

	// Execute the request
	resp, err := s.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error making request to microsoft graph: %w", err)
	}
	defer resp.Body.Close()

	// Check the response status
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusAccepted {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("microsoft graph api returned status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	// Parse the response
	var driveItem DriveItem
	if err := json.NewDecoder(resp.Body).Decode(&driveItem); err != nil {
		return nil, fmt.Errorf("error decoding response: %w", err)
	}

	return &driveItem, nil
}

// ShareFile shares a file with a specific user
func (s *Service) ShareFile(fileID, email, role string) error {
	// Map Google Drive roles to Microsoft Graph roles
	var msRole string
	switch role {
	case "reader":
		msRole = "read"
	case "writer":
		msRole = "write"
	case "owner":
		msRole = "write" // Microsoft Graph doesn't have an owner permission in the same way
	default:
		return fmt.Errorf("unsupported role: %s", role)
	}

	// Create the request body
	requestBody := map[string]interface{}{
		"recipients": []map[string]interface{}{
			{
				"email": email,
			},
		},
		"roles":          []string{msRole},
		"requireSignIn":  true,
		"sendInvitation": true,
	}

	// Marshal the request body to JSON
	jsonBody, err := json.Marshal(requestBody)
	if err != nil {
		return fmt.Errorf("error marshaling request body: %w", err)
	}

	// Construct the URL for the share operation
	// Use SharePoint site drive instead of personal OneDrive
	shareURL := fmt.Sprintf("https://graph.microsoft.com/v1.0/sites/%s/drives/%s/items/%s/invite",
		url.PathEscape(s.SiteID), url.PathEscape(s.DriveID), url.PathEscape(fileID))

	// Create the HTTP request
	req, err := http.NewRequest("POST", shareURL, bytes.NewBuffer(jsonBody))
	if err != nil {
		return fmt.Errorf("error creating request: %w", err)
	}

	// Set headers
	req.Header.Set("Authorization", "Bearer "+s.AccessToken)
	req.Header.Set("Content-Type", "application/json")

	// Execute the request
	resp, err := s.HTTPClient.Do(req)
	if err != nil {
		return fmt.Errorf("error making request to microsoft graph: %w", err)
	}
	defer resp.Body.Close()

	// Check the response status
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusAccepted {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("microsoft graph api returned status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	return nil
}
