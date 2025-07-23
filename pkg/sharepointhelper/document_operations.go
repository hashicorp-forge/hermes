package sharepointhelper

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// CopyFileResponse represents the response from the Microsoft Graph API when copying a file.
type CopyFileResponse struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	WebURL        string `json:"webUrl"`
	CreatedAt     string `json:"createdDateTime"`
	LastModified  string `json:"lastModifiedDateTime"`
	FileExtension string `json:"fileExtension"`
}

// Permission represents a SharePoint permission
type Permission struct {
	ID           string `json:"id"`
	Roles        []string `json:"roles"`
	EmailAddress string   `json:"emailAddress"`
}

// SharePermissionResponse represents the response from the Microsoft Graph API when setting permissions.
type SharePermissionResponse struct {
	ID          string `json:"id"`
	InviteEmail string `json:"inviteEmail"`
	Roles       []string `json:"roles"`
}

// CopyFile copies a template file to create a new document in SharePoint
func (s *Service) CopyFile(templateID, fileName, folderPath string) (*CopyFileResponse, error) {
	// Construct the Microsoft Graph API URL for copying a file
	url := fmt.Sprintf("https://graph.microsoft.com/v1.0/sites/%s/drives/%s/items/%s/copy", 
		s.SiteID, s.DriveID, templateID)

	// Prepare the request body
	body := map[string]interface{}{
		"name": fileName,
		"parentReference": map[string]string{
			"driveId": s.DriveID,
			"id": folderPath, // Use the folder ID directly instead of path
		},
		// Add conflict behavior to rename the file if it already exists
		"@microsoft.graph.conflictBehavior": "rename",
	}
	
	jsonBody, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("error marshaling request body: %w", err)
	}

	// Log the request details
	fmt.Printf("SharePoint copy file request: URL=%s, Body=%s\n", url, string(jsonBody))
	
	// Create the HTTP request
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("error creating request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+s.AccessToken)
	req.Header.Set("Content-Type", "application/json")
	
	// Execute the request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error making copy request to SharePoint: %w", err)
	}
	defer resp.Body.Close()
	
	// Check for a successful response
	if resp.StatusCode != http.StatusAccepted && resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to copy file: %s, %s", resp.Status, string(body))
	}
	
	// Graph API copy operation is asynchronous, so we need to check the Location header
	// to monitor the status of the operation
	monitorURL := resp.Header.Get("Location")
	if monitorURL == "" {
		return nil, fmt.Errorf("no Location header found in copy response")
	}
	
	// Poll the monitor URL until the operation completes
	fileID, err := s.monitorCopyOperation(monitorURL)
	if err != nil {
		// Check if this is a "nameAlreadyExists" error
		if strings.Contains(err.Error(), "nameAlreadyExists") {
			fmt.Printf("File '%s' already exists. Attempting to find the existing file...\n", fileName)
			
			// Try to find the existing file by name in the destination folder
			existingFile, findErr := s.FindFileByName(folderPath, fileName)
			if findErr != nil {
				// If we can't find the existing file, return the original error
				return nil, fmt.Errorf("file already exists but couldn't locate it: %w", err)
			}
			
			fmt.Printf("Found existing file with ID: %s\n", existingFile.ID)
			return existingFile, nil
		}
		
		// For any other error, return it
		return nil, err
	}
	
	// Get file details
	fileDetails, err := s.GetFileDetails(fileID)
	if err != nil {
		return nil, err
	}
	
	return fileDetails, nil
}

// FindFileByName searches for a file by name in the specified folder
func (s *Service) FindFileByName(folderID, fileName string) (*CopyFileResponse, error) {
	// Construct the Microsoft Graph API URL to list items in the folder
	url := fmt.Sprintf("https://graph.microsoft.com/v1.0/sites/%s/drives/%s/items/%s/children", 
		s.SiteID, s.DriveID, folderID)
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("error creating request to find file: %w", err)
	}
	
	req.Header.Set("Authorization", "Bearer "+s.AccessToken)
	
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error finding file by name: %w", err)
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to list folder contents: %s, %s", resp.Status, string(body))
	}
	
	// Parse the response
	var folderContents struct {
		Value []CopyFileResponse `json:"value"`
	}
	
	if err := json.NewDecoder(resp.Body).Decode(&folderContents); err != nil {
		return nil, fmt.Errorf("error decoding folder contents: %w", err)
	}
	
	// Look for the file with the matching name
	for _, file := range folderContents.Value {
		if file.Name == fileName {
			return &file, nil
		}
	}
	
	return nil, fmt.Errorf("file with name '%s' not found in folder", fileName)
}

// monitorCopyOperation polls the monitor URL until the copy operation completes
func (s *Service) monitorCopyOperation(monitorURL string) (string, error) {
	client := &http.Client{}
	maxAttempts := 30 // Increase from 10 to 30 attempts
	
	fmt.Printf("Starting to monitor copy operation at URL: %s\n", monitorURL)
	
	for i := 0; i < maxAttempts; i++ {
		// Add a small delay before each attempt to give SharePoint time to process
		if i > 0 {
			time.Sleep(2 * time.Second)
		}
		
		req, err := http.NewRequest("GET", monitorURL, nil)
		if err != nil {
			return "", fmt.Errorf("error creating monitor request: %w", err)
		}
		// Important: Do NOT set Authorization header for the monitor URL
		// The monitor URL is a special URL that doesn't require authorization
		
		fmt.Printf("Monitor request attempt %d of %d\n", i+1, maxAttempts)
		resp, err := client.Do(req)
		if err != nil {
			fmt.Printf("Error on monitor attempt %d: %v\n", i+1, err)
			continue // Try again rather than failing immediately
		}
		
		defer resp.Body.Close()
		
		body, _ := io.ReadAll(resp.Body)
		fmt.Printf("Monitor response (attempt %d): Status=%s, Body=%s\n", i+1, resp.Status, string(body))
		
		if resp.StatusCode == http.StatusOK {
			// Operation completed
			var result struct {
				ResourceID string `json:"resourceId"`
			}
			
			// Reset the reader for JSON decoding
			resp.Body = io.NopCloser(bytes.NewBuffer(body))
			
			if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
				fmt.Printf("Error decoding monitor response: %v\n", err)
				// Try again rather than failing immediately
				continue
			}
			
			if result.ResourceID == "" {
				fmt.Println("No resourceId in monitor response, will retry")
				continue // Try again
			}
			
			// Operation completed successfully
			fmt.Printf("Copy operation completed successfully! Resource ID: %s\n", result.ResourceID)
			return result.ResourceID, nil
			
		} else if resp.StatusCode == http.StatusAccepted {
			// Operation still in progress
			fmt.Printf("Copy operation in progress (attempt %d of %d)...\n", i+1, maxAttempts)
			continue
		} else if resp.StatusCode == http.StatusConflict {
			// This is likely a duplicate request or name conflict
			fmt.Printf("Conflict detected in copy operation (attempt %d). This may indicate a duplicate file.\n", i+1)
			
			// Try to extract resource ID from the error response if available
			var errResponse struct {
				Error struct {
					Code    string `json:"code"`
					Message string `json:"message"`
				} `json:"error"`
			}
			
			if err := json.Unmarshal(body, &errResponse); err == nil && errResponse.Error.Code == "nameAlreadyExists" {
				fmt.Printf("Name already exists error detected. Will continue with the existing file.\n")
				
				// We need to return something to indicate we should proceed with the existing file
				// For now, return an error that can be recognized
				return "", fmt.Errorf("nameAlreadyExists: %s", string(body))
			}
			
			// Other conflict type, retry
			continue
		} else {
			// Any other error status
			fmt.Printf("Unexpected status from monitor URL: %s\n", resp.Status)
			// Try again rather than failing immediately
			continue
		}
	}
	
	return "", fmt.Errorf("copy operation timed out after %d attempts", maxAttempts)
}

// GetFileDetails retrieves details of a file by its ID
func (s *Service) GetFileDetails(fileID string) (*CopyFileResponse, error) {
	url := fmt.Sprintf("https://graph.microsoft.com/v1.0/sites/%s/drives/%s/items/%s", 
		s.SiteID, s.DriveID, fileID)
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("error creating request for file details: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+s.AccessToken)
	
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error getting file details: %w", err)
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to get file details: %s, %s", resp.Status, string(body))
	}
	
	var fileDetails CopyFileResponse
	if err := json.NewDecoder(resp.Body).Decode(&fileDetails); err != nil {
		return nil, fmt.Errorf("error decoding file details response: %w", err)
	}
	
	return &fileDetails, nil
}

// GetEmbedURL attempts to get an embeddable URL for the file using Microsoft Graph API
func (s *Service) GetEmbedURL(fileID string) (string, error) {
	// Try to get the preview URL from Microsoft Graph
	previewURL := fmt.Sprintf("https://graph.microsoft.com/v1.0/sites/%s/drives/%s/items/%s/preview", 
		s.SiteID, s.DriveID, fileID)
	
	req, err := http.NewRequest("POST", previewURL, nil)
	if err != nil {
		return "", fmt.Errorf("error creating preview request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+s.AccessToken)
	req.Header.Set("Content-Type", "application/json")
	
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("error getting preview URL: %w", err)
	}
	defer resp.Body.Close()
	
	if resp.StatusCode == http.StatusOK {
		var previewResponse struct {
			GetURL string `json:"getUrl"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&previewResponse); err == nil && previewResponse.GetURL != "" {
			return previewResponse.GetURL, nil
		}
	}
	
	// If preview API fails, try to construct Office Online URL
	return "", fmt.Errorf("preview API not available for file %s", fileID)
}

// ShareFile shares a file with a user with the specified role
func (s *Service) ShareFile(fileID, userEmail, role string) error {
	// Construct the Microsoft Graph API URL for sharing a file
	url := fmt.Sprintf("https://graph.microsoft.com/v1.0/sites/%s/drives/%s/items/%s/invite", 
		s.SiteID, s.DriveID, fileID)
	
	// Convert role to SharePoint permission level
	var roles []string
	switch role {
	case "reader":
		roles = []string{"read"}
	case "writer":
		roles = []string{"write"}
	case "owner":
		roles = []string{"write", "owner"}
	default:
		return fmt.Errorf("invalid role: %s", role)
	}
	
	// Prepare the request body
	body := map[string]interface{}{
		"recipients": []map[string]string{
			{
				"email": userEmail,
			},
		},
		"roles": roles,
		"requireSignIn": true,
		"sendInvitation": true,
	}
	
	jsonBody, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("error marshaling request body: %w", err)
	}
	
	// Create the HTTP request
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonBody))
	if err != nil {
		return fmt.Errorf("error creating request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+s.AccessToken)
	req.Header.Set("Content-Type", "application/json")
	
	// Execute the request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("error sharing file: %w", err)
	}
	defer resp.Body.Close()
	
	// Check for a successful response
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("failed to share file: %s, %s", resp.Status, string(body))
	}
	
	return nil
}

// ListPermissions lists all permissions for a file
func (s *Service) ListPermissions(fileID string) ([]Permission, error) {
	url := fmt.Sprintf("https://graph.microsoft.com/v1.0/sites/%s/drives/%s/items/%s/permissions", 
		s.SiteID, s.DriveID, fileID)
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("error creating request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+s.AccessToken)
	
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error listing permissions: %w", err)
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to list permissions: %s, %s", resp.Status, string(body))
	}
	
	var result struct {
		Value []Permission `json:"value"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("error decoding permissions response: %w", err)
	}
	
	return result.Value, nil
}

// DeletePermission deletes a permission by ID
func (s *Service) DeletePermission(fileID, permissionID string) error {
	url := fmt.Sprintf("https://graph.microsoft.com/v1.0/sites/%s/drives/%s/items/%s/permissions/%s", 
		s.SiteID, s.DriveID, fileID, permissionID)
	
	req, err := http.NewRequest("DELETE", url, nil)
	if err != nil {
		return fmt.Errorf("error creating request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+s.AccessToken)
	
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("error deleting permission: %w", err)
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusNoContent && resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("failed to delete permission: %s, %s", resp.Status, string(body))
	}
	
	return nil
}

// ReplaceDocumentHeader replaces the header in a SharePoint document
// This downloads the DOCX file, updates the document.xml content, and re-uploads it
func (s *Service) ReplaceDocumentHeader(fileID string, properties map[string]string) error {
	// Use the DOCX operations to download, modify, and upload the document
	return s.ReplaceDocumentHeaderWithContentUpdate(fileID, properties)
}

// MoveFile moves a file to a new folder
func (s *Service) MoveFile(fileID, folderPath string) (*CopyFileResponse, error) {
	url := fmt.Sprintf("https://graph.microsoft.com/v1.0/sites/%s/drives/%s/items/%s", 
		s.SiteID, s.DriveID, fileID)
	
	body := map[string]interface{}{
		"parentReference": map[string]string{
			"driveId": s.DriveID,
			"path": "/drive/root:" + folderPath,
		},
	}
	
	jsonBody, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("error marshaling request body: %w", err)
	}
	
	req, err := http.NewRequest("PATCH", url, bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("error creating request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+s.AccessToken)
	req.Header.Set("Content-Type", "application/json")
	
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error moving file: %w", err)
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to move file: %s, %s", resp.Status, string(body))
	}
	
	var result CopyFileResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("error decoding move file response: %w", err)
	}
	
	return &result, nil
}
