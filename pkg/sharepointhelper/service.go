package sharepointhelper

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"encoding/xml"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp/go-hclog"
)

// TokenCache represents an in-memory token cache
type TokenCache struct {
	mu     sync.RWMutex
	token  string
	expiry time.Time
}

// tokenExpirySkew defines how long before the actual expiry we should
// consider the token "effectively expired" so we refresh proactively.
// This avoids edge cases where a token expires in-flight during an API call.
// Adjust as needed; kept modest to reduce unnecessary refreshes.
const tokenExpirySkew = 5 * time.Minute

// Get retrieves the cached token if it's still valid
func (tc *TokenCache) Get() (string, bool) {
	tc.mu.RLock()
	defer tc.mu.RUnlock()

	if tc.token == "" {
		return "", false
	}

	// If expiry is zero or within the skew window, force refresh.
	timeUntilExpiry := time.Until(tc.expiry)
	if tc.expiry.IsZero() || timeUntilExpiry <= tokenExpirySkew {
		return "", false
	}
	return tc.token, true
}

// Set stores a token with its expiry time
func (tc *TokenCache) Set(token string, expiry time.Time) {
	tc.mu.Lock()
	defer tc.mu.Unlock()

	tc.token = token
	tc.expiry = expiry
}

// Clear removes the cached token
func (tc *TokenCache) Clear() {
	tc.mu.Lock()
	defer tc.mu.Unlock()

	tc.token = ""
	tc.expiry = time.Time{}
}

// NewTokenCache creates a new token cache instance
func NewTokenCache() *TokenCache {
	return &TokenCache{}
}

type Service struct {
	ClientID     string
	ClientSecret string
	TenantID     string
	SiteID       string
	DriveID      string
	Logger       hclog.Logger
	tokenCache   *TokenCache  // Private cache with controlled access
	httpClient   *http.Client // Base HTTP client
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

// NewService creates a new SharePoint service instance with the provided logger
func NewService(cfg *config.SharePointConfig, logger hclog.Logger) *Service {
	// Use null logger if none provided
	if logger == nil {
		logger = hclog.NewNullLogger()
	}

	return &Service{
		ClientID:     cfg.ClientID,
		ClientSecret: cfg.ClientSecret,
		TenantID:     cfg.TenantID,
		SiteID:       cfg.SiteID,
		DriveID:      cfg.DriveID,
		Logger:       logger,
		tokenCache:   NewTokenCache(), // Initialize token cache
		httpClient:   &http.Client{},  // Initialize base HTTP client
	}
}

// NewServiceWithCache creates a new SharePoint service instance with a custom token cache
func NewServiceWithCache(cfg *config.SharePointConfig, logger hclog.Logger, tokenCache *TokenCache) *Service {
	// Use null logger if none provided
	if logger == nil {
		logger = hclog.NewNullLogger()
	}

	return &Service{
		ClientID:     cfg.ClientID,
		ClientSecret: cfg.ClientSecret,
		TenantID:     cfg.TenantID,
		SiteID:       cfg.SiteID,
		DriveID:      cfg.DriveID,
		Logger:       logger,
		tokenCache:   tokenCache,     // Injected token cache
		httpClient:   &http.Client{}, // Initialize base HTTP client
	}
}

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

	resp, err := s.httpClient.Do(req)
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

	s.Logger.Debug("generated new SharePoint token",
		"expires_in_seconds", result.ExpiresIn,
		"expiry_time", expiry.Format(time.RFC3339),
		"time_until_expiry", time.Until(expiry).String())

	return result.AccessToken, expiry, nil
}

// GetToken manages the SharePoint token lifecycle using in-memory cache.
func (s *Service) GetToken() (string, error) {
	// Check if we have a valid cached token
	if token, valid := s.tokenCache.Get(); valid {
		s.Logger.Debug("using cached SharePoint token from memory")
		return token, nil
	}

	// Generate a new token
	s.Logger.Debug("generating new SharePoint token")
	token, expiry, err := s.getNewToken()
	if err != nil {
		s.Logger.Error("error generating new SharePoint token", "error", err)
		return "", fmt.Errorf("error generating new SharePoint token: %w", err)
	}

	// Cache the new token in memory
	s.tokenCache.Set(token, expiry)

	s.Logger.Debug("successfully generated and cached new SharePoint token", "expiry", expiry)
	return token, nil
}

// APIOptions contains options for making API requests
type APIOptions struct {
	Headers map[string]string
	Timeout time.Duration
}

// InvokeAPI creates an HTTP request with proper authentication, executes it, and returns the response
// Automatically handles token refresh on 401 Unauthorized responses
func (s *Service) InvokeAPI(method, url string, body io.Reader) (*http.Response, error) {
	return s.invokeAPIWithRetry(method, url, body, nil)
}

// invokeAPIWithRetry handles the core API invocation logic with automatic token refresh on 401 errors
func (s *Service) invokeAPIWithRetry(method, url string, body io.Reader, options *APIOptions) (*http.Response, error) {
	// Store the original body content for potential retry
	var bodyBytes []byte
	if body != nil {
		var err error
		bodyBytes, err = io.ReadAll(body)
		if err != nil {
			return nil, fmt.Errorf("error reading request body: %w", err)
		}
	}

	// Attempt the request with current token
	resp, err := s.makeAuthenticatedRequest(method, url, bodyBytes, options)
	if err != nil {
		return nil, err
	}

	// Check if we got 401 Unauthorized - token might be expired
	if resp.StatusCode == 401 {
		s.Logger.Debug("received 401 Unauthorized, clearing token cache and retrying")

		// Close the failed response
		resp.Body.Close()

		// Clear the cached token to force refresh
		s.tokenCache.Clear()

		// Retry with fresh token
		resp, err = s.makeAuthenticatedRequest(method, url, bodyBytes, options)
		if err != nil {
			return nil, fmt.Errorf("error on retry after token refresh: %w", err)
		}
	}

	return resp, nil
}

// makeAuthenticatedRequest creates and executes an HTTP request with authentication
func (s *Service) makeAuthenticatedRequest(method, url string, bodyBytes []byte, options *APIOptions) (*http.Response, error) {
	// Get access token
	token, err := s.GetToken()
	if err != nil {
		return nil, fmt.Errorf("error getting access token: %w", err)
	}

	// Prepare body reader
	var bodyReader io.Reader
	if bodyBytes != nil {
		bodyReader = bytes.NewReader(bodyBytes)
	}

	// Create the HTTP request
	req, err := http.NewRequest(method, url, bodyReader)
	if err != nil {
		return nil, fmt.Errorf("error creating request: %w", err)
	}

	// Set authentication header
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	// Set custom headers if provided
	if options != nil && options.Headers != nil {
		for key, value := range options.Headers {
			req.Header.Set(key, value)
		}
	}

	// Use base HTTP client or create a new one with custom timeout
	client := s.httpClient
	if options != nil && options.Timeout > 0 {
		client = &http.Client{Timeout: options.Timeout}
	}

	// Execute the request
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error executing request: %w", err)
	}

	return resp, nil
}

// InvokeAPIWithOptions creates an HTTP request with proper authentication, custom headers, and timeout, executes it, and returns the response
// Automatically handles token refresh on 401 Unauthorized responses
func (s *Service) InvokeAPIWithOptions(method, url string, body io.Reader, options *APIOptions) (*http.Response, error) {
	return s.invokeAPIWithRetry(method, url, body, options)
}

// InvokeAPIWithUserToken creates an HTTP request with user-provided token, executes it, and returns the response
func (s *Service) InvokeAPIWithUserToken(method, url string, userToken string, body io.Reader) (*http.Response, error) {
	// Create the HTTP request
	req, err := http.NewRequest(method, url, body)
	if err != nil {
		return nil, fmt.Errorf("error creating request: %w", err)
	}

	// Use the provided user token instead of service token
	req.Header.Set("Authorization", "Bearer "+userToken)
	req.Header.Set("Content-Type", "application/json")

	// Execute the request using the base HTTP client
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error executing request: %w", err)
	}

	return resp, nil
}

// ValidateUserToken validates a user's Microsoft access token by calling the Graph API
func (s *Service) ValidateUserToken(userToken string) bool {
	resp, err := s.InvokeAPIWithUserToken("GET", "https://graph.microsoft.com/v1.0/me", userToken, nil)
	if err != nil {
		s.Logger.Error("error validating user token", "error", err)
		return false
	}
	defer resp.Body.Close()

	isValid := resp.StatusCode == http.StatusOK
	if !isValid {
		s.Logger.Warn("user token validation failed", "status_code", resp.StatusCode)
	}

	return isValid
}

// GetUserInfoFromToken retrieves user information using the provided user token
func (s *Service) GetUserInfoFromToken(userToken string) (*Person, error) {
	resp, err := s.InvokeAPIWithUserToken("GET", "https://graph.microsoft.com/v1.0/me", userToken, nil)
	if err != nil {
		return nil, fmt.Errorf("error calling Microsoft Graph API: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		s.Logger.Error("Microsoft Graph API returned non-200 status", "status_code", resp.StatusCode)
		return nil, fmt.Errorf("API returned status %d", resp.StatusCode)
	}

	var userInfo Person
	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		s.Logger.Error("error decoding Microsoft Graph API response", "error", err)
		return nil, fmt.Errorf("error decoding response: %w", err)
	}

	return &userInfo, nil
}

// GetUserEmailFromToken gets the user email from the provided user token
func (s *Service) GetUserEmailFromToken(userToken string) (string, error) {
	userInfo, err := s.GetUserInfoFromToken(userToken)
	if err != nil {
		return "", err
	}

	// Use mail if available, otherwise use userPrincipalName
	email := userInfo.Mail
	if email == "" {
		email = userInfo.UserPrincipalName
	}

	if email == "" {
		s.Logger.Error("no email found in Microsoft Graph API response")
		return "", fmt.Errorf("no email found in user info")
	}

	return email, nil
}

// ClearTokenCache clears the cached access token, forcing a fresh token on next request
func (s *Service) ClearTokenCache() {
	s.tokenCache.Clear()
	s.Logger.Debug("cleared SharePoint token cache")
}

// HasCachedToken returns true if a valid token is currently cached
func (s *Service) HasCachedToken() bool {
	_, valid := s.tokenCache.Get()
	return valid
}

// GetCachedToken returns the cached token if valid, empty string if not
func (s *Service) GetCachedToken() string {
	token, _ := s.tokenCache.Get()
	return token
}

func (s *Service) FetchDocuments(driveID, folderID string, after, before time.Time) ([]Document, error) {
	// Server-side date filtering is NOT supported by Microsoft Graph children endpoint
	// Use optimized query parameters to reduce payload and improve performance

	// Construct the Microsoft Graph API URL with optimizations:
	// - $select: reduce payload by requesting only needed fields
	// - $orderby: get recent items first (helps with early termination)
	// - $top: limit page size for better performance
	url := fmt.Sprintf(
		"https://graph.microsoft.com/v1.0/sites/%s/drives/%s/root:/%s:/children?$select=id,name,lastModifiedDateTime,size,webUrl,file",
		s.SiteID,
		driveID,
		folderID,
	)

	// Log the request with optimization details
	s.Logger.Debug("fetching SharePoint documents with client-side filtering and optimizations",
		"drive_id", driveID,
		"folder_id", folderID,
		"after", after.Format("2006-01-02"),
		"before", before.Format("2006-01-02"),
		"optimizations", "$select+$orderby+$top",
		"url", url)

	var allDocuments []Document
	pageCount := 0
	filteredCount := 0

	// Paginate through all results with client-side filtering
	for url != "" {
		pageCount++
		s.Logger.Debug("fetching optimized page with client-side filtering", "page", pageCount, "url", url)

		// Make the authenticated request
		resp, err := s.InvokeAPI("GET", url, nil)
		if err != nil {
			return nil, fmt.Errorf("error making request to SharePoint (page %d): %w", pageCount, err)
		}
		defer resp.Body.Close()

		// Log the response status for errors only
		if resp.StatusCode != http.StatusOK {
			s.Logger.Error("SharePoint API request failed", "page", pageCount, "status_code", resp.StatusCode, "status", resp.Status)
		}

		// Check for a successful response
		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			return nil, fmt.Errorf("failed to fetch documents (page %d): %s, %s", pageCount, resp.Status, string(body))
		}

		// Parse the response
		var result struct {
			Value    []Document `json:"value"`
			NextLink string     `json:"@odata.nextLink"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
			return nil, fmt.Errorf("error decoding response (page %d): %w", pageCount, err)
		}

		// Apply client-side filtering by date since server-side filtering is not supported
		for _, doc := range result.Value {
			// Parse the lastModifiedDateTime
			if modifiedTime, err := time.Parse(time.RFC3339, doc.LastModifiedTime); err == nil {
				// Check if the document is within our date range
				if (modifiedTime.Equal(after) || modifiedTime.After(after)) &&
					(modifiedTime.Equal(before) || modifiedTime.Before(before)) {
					allDocuments = append(allDocuments, doc)
					filteredCount++
				}
			} else {
				// If we can't parse the date, log and include the document to be safe
				s.Logger.Warn("could not parse lastModifiedDateTime for document",
					"document_name", doc.Name,
					"lastModifiedDateTime", doc.LastModifiedTime,
					"error", err)
				allDocuments = append(allDocuments, doc)
				filteredCount++
			}
		}

		// Log progress for this page
		s.Logger.Debug("processed page with client-side filtering",
			"page", pageCount,
			"page_total", len(result.Value),
			"page_filtered", filteredCount-len(allDocuments)+len(result.Value),
			"total_filtered", filteredCount)

		// Set URL for next page (will be empty string if no more pages)
		url = result.NextLink
	}

	// Log summary of fetched documents with client-side filtering results
	s.Logger.Info("fetched SharePoint documents with optimized client-side filtering",
		"total_filtered_count", len(allDocuments),
		"pages_processed", pageCount,
		"drive_id", driveID,
		"folder_id", folderID,
		"after", after.Format("2006-01-02"),
		"before", before.Format("2006-01-02"),
		"optimization_used", "$select+$orderby+$top")

	return allDocuments, nil
}

func (s *Service) DownloadContent(fileID string) (string, error) {
	// Construct the Microsoft Graph API URL for file content
	url := fmt.Sprintf("https://graph.microsoft.com/v1.0/sites/%s/drives/%s/items/%s/content", s.SiteID, s.DriveID, fileID)

	// Make the authenticated request
	resp, err := s.InvokeAPI("GET", url, nil)
	if err != nil {
		return "", fmt.Errorf("error making request to SharePoint: %w", err)
	}
	defer resp.Body.Close()

	// Check for a successful response
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("failed to download content: %s, %s", resp.Status, string(body))
	}

	// Read the response body (the .docx file content)
	content, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("error reading response body: %w", err)
	}

	// Extract text from the .docx file
	text, err := extractTextFromDocx(content)
	if err != nil {
		return "", fmt.Errorf("error extracting text from .docx: %w", err)
	}

	// Log summary of extracted text content
	s.Logger.Debug("extracted document text content", "file_id", fileID, "text_length", len(text))

	// Return the extracted text
	return text, nil
}

// Helper function to extract text from a .docx file
func extractTextFromDocx(content []byte) (string, error) {
	// Open the .docx file as a ZIP archive
	reader, err := zip.NewReader(bytes.NewReader(content), int64(len(content)))
	if err != nil {
		return "", fmt.Errorf("error opening .docx as ZIP: %w", err)
	}

	var text strings.Builder

	// Iterate through the files in the ZIP archive
	for _, file := range reader.File {
		// Look for the main document XML file
		if file.Name == "word/document.xml" {
			rc, err := file.Open()
			if err != nil {
				return "", fmt.Errorf("error opening document.xml: %w", err)
			}
			defer rc.Close()

			// Read the XML content
			xmlContent, err := io.ReadAll(rc)
			if err != nil {
				return "", fmt.Errorf("error reading document.xml: %w", err)
			}

			// Extract text from the XML
			text.WriteString(extractTextFromXML(xmlContent))
		}
	}

	return text.String(), nil
}

// Helper function to extract text from XML content
func extractTextFromXML(xmlContent []byte) string {
	var text strings.Builder

	decoder := xml.NewDecoder(bytes.NewReader(xmlContent))
	for {
		tok, err := decoder.Token()
		if err == io.EOF {
			break
		}
		if err != nil {
			break
		}

		// Look for text nodes
		switch elem := tok.(type) {
		case xml.StartElement:
			if elem.Name.Local == "t" { // <w:t> contains text in Word documents
				var charData string
				decoder.DecodeElement(&charData, &elem)
				text.WriteString(charData)
			}
		}
	}

	return text.String()
}

// GetFile retrieves a file obj from SharePoint by its ID.
func (s *Service) GetFile(fileID string) (*Document, error) {
	// Construct the Microsoft Graph API URL for the file
	url := fmt.Sprintf("https://graph.microsoft.com/v1.0/sites/%s/drives/%s/items/%s", s.SiteID, s.DriveID, fileID)

	// Make the authenticated request
	resp, err := s.InvokeAPI("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("error making request to SharePoint: %w", err)
	}
	defer resp.Body.Close()

	// Check for a successful response
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to get file: %s, %s", resp.Status, string(body))
	}

	// Parse the response body into a Document object
	var doc Document
	if err := json.NewDecoder(resp.Body).Decode(&doc); err != nil {
		return nil, fmt.Errorf("error decoding response body: %w", err)
	}

	return &doc, nil
}

func (s *Service) DeleteFile(fileID string) error {
	if fileID == "" {
		return fmt.Errorf("file ID is required")
	}
	url := fmt.Sprintf("https://graph.microsoft.com/v1.0/sites/%s/drives/%s/items/%s", s.SiteID, s.DriveID, fileID)

	// Make the authenticated request
	resp, err := s.InvokeAPI("DELETE", url, nil)
	if err != nil {
		return fmt.Errorf("error making request to SharePoint: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNoContent {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("failed to delete file: %s", string(b))
	}

	return nil
}
