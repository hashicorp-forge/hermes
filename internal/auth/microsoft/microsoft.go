package microsoft

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp/go-hclog"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/microsoft"
)

// MicrosoftAuthenticator handles Microsoft authentication
type MicrosoftAuthenticator struct {
	Config *config.MicrosoftAuth
	Log    hclog.Logger
}

// New creates a new Microsoft authenticator
func New(cfg config.MicrosoftAuth, log hclog.Logger) (*MicrosoftAuthenticator, error) {
	return &MicrosoftAuthenticator{
		Config: &cfg,
		Log:    log,
	}, nil
}


// from demo snippet
func handleAuthenticate(w http.ResponseWriter, r *http.Request, cfg config.MicrosoftAuth, logger hclog.Logger) {
	// Check if this is a callback from Microsoft with auth code
	if code := r.URL.Query().Get("code"); code != "" {
		handleAuthCallback(w, r, cfg, logger)
		return
	}

	// Otherwise, initiate the auth flow
	initiateAuthFlow(w, r, cfg, logger)
}


// AuthenticateRequest is middleware that authenticates an HTTP request using Microsoft
func AuthenticateRequest(cfg config.MicrosoftAuth, log hclog.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Println("Microsoft AuthenticateRequest function called", 
			"path", r.URL.Path, 
			"method", r.Method,
			"client_id", cfg.ClientID,
			"redirect_uri", cfg.RedirectURI)
		
		// For static assets and public paths, skip authentication
		if strings.HasPrefix(r.URL.Path, "/assets/") || 
		   strings.HasPrefix(r.URL.Path, "/public/") ||
		   r.URL.Path == "/favicon.ico" {
			next.ServeHTTP(w, r)
			return
		}
		
		// Special case for the authenticate page itself
		if r.URL.Path == "/authenticate" {
			// If code is present, this is the callback from Microsoft
			if r.URL.Query().Get("code") != "" {
				fmt.Println("Handling auth callback with code")
				handleAuthCallback(w, r, cfg, log)
				return
			} else if r.URL.Query().Get("init") == "true" {
				// If init parameter is present, initiate the auth flow
				fmt.Println("Initiating auth flow from explicit init parameter")
				initiateAuthFlow(w, r, cfg, log)
				return
			} else if r.Method == "GET" && r.Header.Get("Accept") == "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7" {
				// If it looks like a browser request directly to /authenticate, initiate the auth flow
				fmt.Println("Initiating auth flow - redirect to Microsoft")
				initiateAuthFlow(w, r, cfg, log)
				return
			} else {
				// For other cases like API requests, serve the page normally
				fmt.Println("Serving authenticate page without initiating flow")
				next.ServeHTTP(w, r)
				return
			}
		}
		
		// Check for existing auth token in header or cookie
		token := extractTokenFromRequest(r)
		if token != "" {
			fmt.Println("Found token in request", "token_length", len(token))
			// Validate token with Microsoft
			if isValidToken(token, cfg, log) {
				// Set user email in context
				email, err := getUserEmailFromToken(token, cfg, log)
				if err == nil && email != "" {
					fmt.Println("Setting user email in context", "email", email)
					ctx := context.WithValue(r.Context(), "userEmail", email)
					next.ServeHTTP(w, r.WithContext(ctx))
					return
				} else {
					fmt.Println("Failed to get user email from token", "error", err)
				}
			} else {
				fmt.Println("Token validation failed")
			}
		} else {
			fmt.Println("No token found in request")
		}
		
		// If it's an API request or AJAX request, return 401 with JSON response
		if strings.HasPrefix(r.URL.Path, "/api/") || r.Header.Get("X-Requested-With") == "XMLHttpRequest" {
			fmt.Println("Unauthorized API request", "path", r.URL.Path)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"error": "Unauthorized",
				"redirect": "/authenticate",
				"message": "Please authenticate to access this resource",
			})
			return
		}
		
		// For regular web pages, redirect to authenticate
		if r.URL.Path != "/authenticate" {
			fmt.Println("Redirecting to authenticate", "from_path", r.URL.Path)
			http.Redirect(w, r, "/authenticate", http.StatusFound)
			return
		}
		
		// Allow the /authenticate page to be served
		next.ServeHTTP(w, r)
	})
}

// extractTokenFromRequest extracts the token from the request
func extractTokenFromRequest(r *http.Request) string {
	// Check Authorization header
	authHeader := r.Header.Get("Authorization")
	if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
		return strings.TrimPrefix(authHeader, "Bearer ")
	}
	
	// Check Cookie - check both microsoft_token and the standard token cookie name
	cookie, err := r.Cookie("microsoft_token")
	if err == nil && cookie != nil && cookie.Value != "" {
		return cookie.Value
	}
	
	// Check for alternative cookie names
	cookie, err = r.Cookie("token")
	if err == nil && cookie != nil && cookie.Value != "" {
		return cookie.Value
	}
	
	// Check for auth_token cookie
	cookie, err = r.Cookie("auth_token")
	if err == nil && cookie != nil && cookie.Value != "" {
		return cookie.Value
	}
	
	// If we have a user_email cookie, that indicates a successful login happened
	// and we should check for any available cookies
	cookie, err = r.Cookie("user_email") 
	if err == nil && cookie != nil && cookie.Value != "" {
		// Loop through all cookies to find any that might be the token
		for _, c := range r.Cookies() {
			if len(c.Value) > 100 { // Token should be fairly long
				return c.Value
			}
		}
	}
	
	return ""
}

// isValidToken validates the token with Microsoft
func isValidToken(token string, cfg config.MicrosoftAuth, log hclog.Logger) bool {
	// Make a simple request to Microsoft Graph API to validate the token
	client := &http.Client{}
	req, err := http.NewRequest("GET", "https://graph.microsoft.com/v1.0/me", nil)
	if err != nil {
		fmt.Println("Error creating request to Microsoft Graph", "error", err)
		return false
	}
	
	req.Header.Add("Authorization", "Bearer "+token)
	
	resp, err := client.Do(req)
	if err != nil {
		fmt.Println("Error calling Microsoft Graph API", "error", err)
		return false
	}
	defer resp.Body.Close()
	
	return resp.StatusCode == http.StatusOK
}

// getUserEmailFromToken gets the user email from the token
func getUserEmailFromToken(token string, cfg config.MicrosoftAuth, log hclog.Logger) (string, error) {
	// Make a request to Microsoft Graph API to get the user's email
	client := &http.Client{}
	req, err := http.NewRequest("GET", "https://graph.microsoft.com/v1.0/me", nil)
	if err != nil {
		fmt.Println("Error creating request to Microsoft Graph", "error", err)
		return "", err
	}
	
	req.Header.Add("Authorization", "Bearer "+token)
	
	resp, err := client.Do(req)
	if err != nil {
		fmt.Println("Error calling Microsoft Graph API", "error", err)
		return "", err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		fmt.Println("Microsoft Graph API returned non-200 status", "status", resp.StatusCode)
		return "", fmt.Errorf("Microsoft Graph API returned status %d", resp.StatusCode)
	}
	
	// Parse the response body
	var data struct {
		Mail                 string `json:"mail"`
		UserPrincipalName    string `json:"userPrincipalName"`
		DisplayName          string `json:"displayName"`
	}
	
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		fmt.Println("Error decoding Microsoft Graph API response", "error", err)
		return "", err
	}
	
	// Use mail if available, otherwise use userPrincipalName
	email := data.Mail
	if email == "" {
		email = data.UserPrincipalName
	}
	
	fmt.Println("Got user email from Microsoft Graph API", "email", email)
	return email, nil
}

// initiateAuthFlow redirects to Microsoft login
// func initiateAuthFlow(w http.ResponseWriter, r *http.Request, cfg config.MicrosoftAuth, log hclog.Logger) {
// 	// Create OAuth2 config for Microsoft
// 	oauth2Config := &oauth2.Config{
// 		ClientID:     cfg.ClientID,
// 		ClientSecret: cfg.ClientSecret,
// 		RedirectURL:  cfg.RedirectURI,
// 		Endpoint:     microsoft.AzureADEndpoint(cfg.TenantID),
// 		Scopes:       []string{"openid", "profile", "email", "User.Read"},
// 	}
	
// 	// Generate authorization URL with a random state for security
// 	state := fmt.Sprintf("%d", time.Now().UnixNano())
// 	url := oauth2Config.AuthCodeURL(state, oauth2.AccessTypeOffline)
	
// 	fmt.Println("Redirecting to Microsoft login", 
// 		"url", url,
// 		"client_id", cfg.ClientID,
// 		"tenant_id", cfg.TenantID,
// 		"redirect_uri", cfg.RedirectURI)
	
// 	// Set a cookie to indicate auth is in progress (helps debugging)
// 	http.SetCookie(w, &http.Cookie{
// 		Name:     "auth_in_progress",
// 		Value:    "microsoft",
// 		Path:     "/",
// 		HttpOnly: false,
// 		MaxAge:   600, // 10 minutes
// 		SameSite: http.SameSiteLaxMode,
// 	})
	
// 	// Redirect to Microsoft login
// 	http.Redirect(w, r, url, http.StatusFound)
// }


// from demo snippet
func initiateAuthFlow(w http.ResponseWriter, r *http.Request, cfg config.MicrosoftAuth, logger hclog.Logger) {
	// Create OAuth2 config for Microsoft
	oauth2Config := &oauth2.Config{
		ClientID:     cfg.ClientID,
		ClientSecret: cfg.ClientSecret,
		RedirectURL:  cfg.RedirectURI,
		Endpoint:     microsoft.AzureADEndpoint(cfg.TenantID),
		Scopes:       []string{"openid", "profile", "email", "User.Read"},
	}

	// Generate authorization URL with a random state for security
	state := fmt.Sprintf("%d", time.Now().UnixNano())
	url := oauth2Config.AuthCodeURL(state, oauth2.AccessTypeOffline)

	logger.Info("Redirecting to Microsoft login",
		"url", url,
		"client_id", cfg.ClientID,
		"tenant_id", cfg.TenantID,
		"redirect_uri", cfg.RedirectURI)

	// Set a cookie to indicate auth is in progress
	http.SetCookie(w, &http.Cookie{
		Name:     "auth_in_progress",
		Value:    "microsoft",
		Path:     "/",
		HttpOnly: false,
		MaxAge:   600, // 10 minutes
		SameSite: http.SameSiteLaxMode,
	})

	// Redirect to Microsoft login page
	http.Redirect(w, r, url, http.StatusFound)
}


// handleAuthCallback handles the redirect callback from Microsoft
// func handleAuthCallback(w http.ResponseWriter, r *http.Request, cfg config.MicrosoftAuth, log hclog.Logger) {
// 	code := r.URL.Query().Get("code")
// 	if code == "" {
// 		fmt.Println("No code received from Microsoft")
// 		http.Error(w, "No authorization code received", http.StatusBadRequest)
// 		return
// 	}
	
// 	fmt.Println("Received authorization code from Microsoft", "code_length", len(code))
	
// 	// Create OAuth2 config for Microsoft
// 	oauth2Config := &oauth2.Config{
// 		ClientID:     cfg.ClientID,
// 		ClientSecret: cfg.ClientSecret,
// 		RedirectURL:  cfg.RedirectURI,
// 		Endpoint:     microsoft.AzureADEndpoint(cfg.TenantID),
// 		Scopes:       []string{"openid", "profile", "email", "User.Read"},
// 	}
	
// 	// Exchange authorization code for token
// 	token, err := oauth2Config.Exchange(context.Background(), code)
// 	if err != nil {
// 		fmt.Println("Error exchanging code for token", "error", err)
// 		http.Error(w, "Failed to authenticate: "+err.Error(), http.StatusInternalServerError)
// 		return
// 	}
	
// 	fmt.Println("Successfully exchanged code for token", "token_type", token.TokenType, "expires", token.Expiry)
	
// 	// Get user email from Microsoft Graph
// 	client := oauth2Config.Client(context.Background(), token)
// 	resp, err := client.Get("https://graph.microsoft.com/v1.0/me")
// 	if err != nil {
// 		fmt.Println("Error calling Microsoft Graph API", "error", err)
// 		http.Error(w, "Failed to get user info: "+err.Error(), http.StatusInternalServerError)
// 		return
// 	}
// 	defer resp.Body.Close()
	
// 	var data struct {
// 		Mail              string `json:"mail"`
// 		UserPrincipalName string `json:"userPrincipalName"`
// 		DisplayName       string `json:"displayName"`
// 	}
	
// 	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
// 		fmt.Println("Error decoding Microsoft Graph API response", "error", err)
// 		http.Error(w, "Failed to parse user info: "+err.Error(), http.StatusInternalServerError)
// 		return
// 	}
	
// 	// Use mail if available, otherwise use userPrincipalName
// 	email := data.Mail
// 	if email == "" {
// 		email = data.UserPrincipalName
// 	}
	
// 	if email == "" {
// 		fmt.Println("No email found in Microsoft Graph API response")
// 		http.Error(w, "Failed to get user email", http.StatusInternalServerError)
// 		return
// 	}
	
// 	fmt.Println("Got user email from Microsoft Graph API", "email", email, "name", data.DisplayName)
	
// 	// Set token in cookie - secured, httpOnly
// 	http.SetCookie(w, &http.Cookie{
// 		Name:     "microsoft_token",
// 		Value:    token.AccessToken,
// 		Path:     "/",
// 		HttpOnly: true,
// 		// Secure:   r.TLS != nil,
// 		Secure:  false,
// 		MaxAge:   int(token.Expiry.Sub(time.Now()).Seconds()),
// 		SameSite: http.SameSiteLaxMode,
// 	})
	
// 	// Also set email in a separate cookie for easy access
// 	http.SetCookie(w, &http.Cookie{
// 		Name:     "user_email",
// 		Value:    email,
// 		Path:     "/",
// 		HttpOnly: false, // Allow JavaScript to read this cookie
// 		// Secure:   r.TLS != nil,
// 		Secure:  false,
// 		MaxAge:   int(token.Expiry.Sub(time.Now()).Seconds()),
// 		SameSite: http.SameSiteLaxMode,
// 	})

// 	// Add debug cookie to see if cookies are being set
// 	http.SetCookie(w, &http.Cookie{
// 		Name:     "auth_debug",
// 		Value:    "callback_completed",
// 		Path:     "/",
// 		HttpOnly: false,
// 		MaxAge:   600, // 10 minutes
// 		SameSite: http.SameSiteLaxMode,
// 	})
	
// 	// Log success before redirect
// 	fmt.Println("Authentication successful, redirecting to home page", 
// 		"email", email, 
// 		"token_length", len(token.AccessToken))

// 	// Redirect to the application root
// 	http.Redirect(w, r, "/", http.StatusFound)
// }


// from demo snippet
func handleAuthCallback(w http.ResponseWriter, r *http.Request, cfg config.MicrosoftAuth, logger hclog.Logger) {
	// Get authorization code from query parameters
	code := r.URL.Query().Get("code")
	if code == "" {
		logger.Error("No authorization code provided")
		http.Error(w, "No authorization code provided", http.StatusBadRequest)
		return
	}

	// Create OAuth2 config for Microsoft
	oauth2Config := &oauth2.Config{
		ClientID:     cfg.ClientID,
		ClientSecret: cfg.ClientSecret,
		RedirectURL:  cfg.RedirectURI,
		Endpoint:     microsoft.AzureADEndpoint(cfg.TenantID),
		Scopes:       []string{"openid", "profile", "email", "User.Read"},
	}

	// Exchange authorization code for token
	token, err := oauth2Config.Exchange(context.Background(), code)
	if err != nil {
		logger.Error("Error exchanging code for token", "error", err)
		http.Error(w, "Failed to authenticate: "+err.Error(), http.StatusInternalServerError)
		return
	}

	logger.Info("Successfully exchanged code for token", "token_type", token.TokenType, "expires", token.Expiry)

	// Get user email from Microsoft Graph
	client := oauth2Config.Client(context.Background(), token)
	resp, err := client.Get("https://graph.microsoft.com/v1.0/me")
	if err != nil {
		logger.Error("Error calling Microsoft Graph API", "error", err)
		http.Error(w, "Failed to get user info: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	var data struct {
		Mail              string `json:"mail"`
		UserPrincipalName string `json:"userPrincipalName"`
		DisplayName       string `json:"displayName"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		logger.Error("Error decoding Microsoft Graph API response", "error", err)
		http.Error(w, "Failed to parse user info: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Use mail if available, otherwise use userPrincipalName
	email := data.Mail
	if email == "" {
		email = data.UserPrincipalName
	}

	logger.Info("User authenticated", "email", email, "name", data.DisplayName)

	// Set cookies with authentication information
	http.SetCookie(w, &http.Cookie{
		Name:     "user_email",
		Value:    email,
		Path:     "/",
		HttpOnly: false, // Allow JavaScript to read for display purposes
		MaxAge:   3600,  // 1 hour
		SameSite: http.SameSiteLaxMode,
	})

	// Store token as a cookie (in production, you would use a more secure method)
	tokenBytes, _ := json.Marshal(token)
	http.SetCookie(w, &http.Cookie{
		Name:     "microsoft_token",
		Value:    string(tokenBytes),
		Path:     "/",
		HttpOnly: true, // Prevent JavaScript access
		MaxAge:   3600, // 1 hour
		SameSite: http.SameSiteLaxMode,
	})

	// Redirect back to home page
	http.Redirect(w, r, "/", http.StatusFound)
}