package microsoft

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/pkg/sharepointhelper"
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

// AuthenticateRequest is middleware that authenticates an HTTP request using Microsoft
func AuthenticateRequest(cfg *config.SharePointConfig, log hclog.Logger, spService *sharepointhelper.Service, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		// For static assets and public paths, skip authentication but set a default email
		if strings.HasPrefix(r.URL.Path, "/assets/") ||
			strings.HasPrefix(r.URL.Path, "/public/") ||
			strings.HasPrefix(r.URL.Path, "/static/") ||
			strings.HasPrefix(r.URL.Path, "/images") ||
			strings.HasPrefix(r.URL.Path, "/addin/") ||
			strings.HasPrefix(r.URL.Path, "/.") ||
			r.URL.Path == "/favicon.ico" {
			// Set a default email in context to avoid errors downstream
			ctx := context.WithValue(r.Context(), "userEmail", "anonymous@static-asset")
			next.ServeHTTP(w, r.WithContext(ctx))
			return
		}

		// Special case for the authenticate page itself
		if r.URL.Path == "/authenticate" {
			// If code is present, this is the callback from Microsoft
			if r.URL.Query().Get("code") != "" {
				handleAuthCallback(w, r, cfg, log)
				return
			} else if r.URL.Query().Get("init") == "true" {
				// If init parameter is present, initiate the auth flow
				initiateAuthFlow(w, r, cfg, log)
				return
			} else if r.Method == "GET" && strings.Contains(r.Header.Get("Accept"), "text/html") {
				// If it looks like a browser request directly to /authenticate, initiate the auth flow
				initiateAuthFlow(w, r, cfg, log)
				return
			} else {
				// For other cases like API requests, serve the page normally
				next.ServeHTTP(w, r)
				return
			}
		}

		// Check for existing auth token in header or cookie
		token := extractTokenFromRequest(r)
		if token != "" {
			// Validate token with Microsoft using SharePoint service
			if validateUserToken(token, log, spService) {
				// Set user email in context
				email, err := getUserEmailFromToken(token, log, spService)
				if err == nil && email != "" {

					// Set both user email AND Microsoft token in context for downstream handlers
					ctx := context.WithValue(r.Context(), "userEmail", email)
					ctx = context.WithValue(ctx, "microsoftToken", token)

					next.ServeHTTP(w, r.WithContext(ctx))
					return
				} else {
					log.Warn("Failed to get user email from token", "error", err)
				}
			} else {
				log.Warn("token validation failed")
			}
		}

		// If it's an API request or AJAX request, return 401 with JSON response
		if strings.HasPrefix(r.URL.Path, "/api/") || r.Header.Get("X-Requested-With") == "XMLHttpRequest" {
			log.Warn("unauthorized API request", "path", r.URL.Path)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"error":    "Unauthorized",
				"redirect": "/authenticate",
				"message":  "Please authenticate to access this resource",
			})
			return
		}

		// For regular web pages, redirect to authenticate
		if r.URL.Path != "/authenticate" {
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

// validateUserToken validates the token with Microsoft using SharePoint service
func validateUserToken(token string, log hclog.Logger, spService *sharepointhelper.Service) bool {
	if spService == nil {
		log.Error("SharePoint service is required for token validation")
		return false
	}

	return spService.ValidateUserToken(token)
}

// getUserEmailFromToken gets the user email from the token using SharePoint service
func getUserEmailFromToken(token string, log hclog.Logger, spService *sharepointhelper.Service) (string, error) {
	if spService == nil {
		log.Error("SharePoint service is required for getting user email")
		return "", fmt.Errorf("SharePoint service is required")
	}

	return spService.GetUserEmailFromToken(token)
}

func initiateAuthFlow(w http.ResponseWriter, r *http.Request, cfg *config.SharePointConfig, logger hclog.Logger) {
	logger.Debug("initiating Microsoft auth flow")

	// Check if this is a popup flow request.
	// The "popup" parameter is expected to be "true" or "false" (case-insensitive).
	popupParam := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("popup")))
	isPopup := popupParam == "true"

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
	if isPopup {
		state = "popup_" + state
	}
	url := oauth2Config.AuthCodeURL(state, oauth2.AccessTypeOffline)

	// Set a cookie to indicate auth is in progress
	http.SetCookie(w, &http.Cookie{
		Name:     "auth_in_progress",
		Value:    "microsoft",
		Path:     "/",
		HttpOnly: true,
		MaxAge:   600, // 10 minutes
		SameSite: http.SameSiteNoneMode,
		Secure:   true,
	})

	// Store popup state in a cookie if this is a popup flow
	if isPopup {
		http.SetCookie(w, &http.Cookie{
			Name:     "auth_is_popup",
			Value:    "true",
			Path:     "/",
			HttpOnly: true,
			MaxAge:   600, // 10 minutes
			SameSite: http.SameSiteNoneMode,
			Secure:   true,
		})
	}

	logger.Debug("Auth cookie set, redirecting to Microsoft login page", "isPopup", isPopup)

	// Redirect to Microsoft login page
	http.Redirect(w, r, url, http.StatusFound)
}

func handleAuthCallback(w http.ResponseWriter, r *http.Request, cfg *config.SharePointConfig, logger hclog.Logger) {
	// Log the start of the callback handling
	logger.Info("Handling Microsoft auth callback", "path", r.URL.Path)

	// Get authorization code from query parameters
	code := r.URL.Query().Get("code")
	if code == "" {
		logger.Error("No authorization code provided in callback")
		http.Error(w, "No authorization code provided", http.StatusBadRequest)
		return
	}
	logger.Info("Authorization code received", "code_length", len(code))

	// Create OAuth2 config for Microsoft
	oauth2Config := &oauth2.Config{
		ClientID:     cfg.ClientID,
		ClientSecret: cfg.ClientSecret,
		RedirectURL:  cfg.RedirectURI,
		Endpoint:     microsoft.AzureADEndpoint(cfg.TenantID),
		Scopes:       []string{"openid", "profile", "email", "User.Read"},
	}

	// Exchange authorization code for token
	logger.Info("Exchanging authorization code for token")
	token, err := oauth2Config.Exchange(context.Background(), code)
	if err != nil {
		logger.Error("Error exchanging code for token", "error", err)
		http.Error(w, "Failed to authenticate: "+err.Error(), http.StatusInternalServerError)
		return
	}
	logger.Info("Successfully exchanged code for token", "token_type", token.TokenType, "expires", token.Expiry)

	// Get user email from Microsoft Graph
	logger.Info("Fetching user email from Microsoft Graph API")
	client := oauth2Config.Client(context.Background(), token)
	resp, err := client.Get("https://graph.microsoft.com/v1.0/me")
	if err != nil {
		logger.Error("Error calling Microsoft Graph API", "error", err)
		http.Error(w, "Failed to get user info: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		logger.Error("Microsoft Graph API returned non-200 status", "status", resp.StatusCode)
		http.Error(w, "Failed to get user info", http.StatusInternalServerError)
		return
	}

	// Parse the response body
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
	if email == "" {
		logger.Error("No email found in Microsoft Graph API response")
		http.Error(w, "Failed to get user email", http.StatusInternalServerError)
		return
	}
	logger.Info("User authenticated successfully", "email", email, "name", data.DisplayName)

	// Check if this is a popup authentication flow
	isPopupFlow := false
	if cookie, err := r.Cookie("auth_is_popup"); err == nil && cookie.Value == "true" {
		isPopupFlow = true
	}

	// Set cookies with authentication information
	http.SetCookie(w, &http.Cookie{
		Name:     "user_email",
		Value:    email,
		Path:     "/",
		HttpOnly: true,
		MaxAge:   3600,
		SameSite: http.SameSiteNoneMode,
		Secure:   true,
	})

	http.SetCookie(w, &http.Cookie{
		Name:     "microsoft_token",
		Value:    token.AccessToken,
		Path:     "/",
		HttpOnly: true,
		MaxAge:   int(time.Until(token.Expiry).Seconds()),
		SameSite: http.SameSiteNoneMode,
		Secure:   true,
	})

	// Clear the popup indicator cookie
	if isPopupFlow {
		http.SetCookie(w, &http.Cookie{
			Name:     "auth_is_popup",
			Value:    "",
			Path:     "/",
			HttpOnly: true,
			MaxAge:   -1, // Delete cookie
			SameSite: http.SameSiteNoneMode,
			Secure:   true,
		})
	}

	// Log success before redirect
	logger.Info("Authentication successful, redirecting", "email", email, "isPopup", isPopupFlow)

	// If this is a popup flow, redirect to the auth callback page
	// Otherwise, redirect to the dashboard
	if isPopupFlow {
		http.Redirect(w, r, "/addin/auth-callback.html", http.StatusFound)
	} else {
		http.Redirect(w, r, "/dashboard", http.StatusFound)
	}
}
