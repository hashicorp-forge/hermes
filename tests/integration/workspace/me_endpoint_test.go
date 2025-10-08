//go:build integration
// +build integration

// Package workspace contains integration tests for workspace adapters.
// This test verifies that the /me endpoint correctly uses users.json
// when the local workspace provider is configured.
package workspace

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/hashicorp-forge/hermes/internal/api/v2"
	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/internal/server"
	pkgauth "github.com/hashicorp-forge/hermes/pkg/auth"
	"github.com/hashicorp-forge/hermes/pkg/workspace/adapters/local"
	"github.com/hashicorp/go-hclog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestLocalWorkspace_MeEndpoint_UsesUsersJSON verifies that the /me endpoint
// correctly retrieves user information from users.json when using the local
// workspace provider.
func TestLocalWorkspace_MeEndpoint_UsesUsersJSON(t *testing.T) {
	WithTimeout(t, 2*time.Minute, 30*time.Second, func(ctx context.Context, progress func(string)) {
		// Setup: Create temporary storage directory with users.json
		storageDir := filepath.Join(os.TempDir(), fmt.Sprintf("hermes-me-test-%d", os.Getpid()))
		err := os.MkdirAll(storageDir, 0755)
		require.NoError(t, err, "Failed to create storage directory")
		defer os.RemoveAll(storageDir)

		progress("Created storage directory")

		// Create users.json with test data matching Dex identities
		usersJSON := `{
  "test@hermes.local": {
    "email": "test@hermes.local",
    "name": "Test User",
    "given_name": "Test",
    "family_name": "User",
    "photo_url": "https://ui-avatars.com/api/?name=Test+User&background=5c4ee5&color=fff&size=200",
    "id": "08a8684b-db88-4b73-90a9-3cd1661f5466",
    "groups": ["users", "testers"]
  },
  "admin@hermes.local": {
    "email": "admin@hermes.local",
    "name": "Admin User",
    "given_name": "Admin",
    "family_name": "User",
    "photo_url": "https://ui-avatars.com/api/?name=Admin+User&background=1563ff&color=fff&size=200",
    "id": "08a8684b-db88-4b73-90a9-3cd1661f5467",
    "groups": ["users", "admins"]
  },
  "user@hermes.local": {
    "email": "user@hermes.local",
    "name": "Regular User",
    "given_name": "Regular",
    "family_name": "User",
    "photo_url": "https://ui-avatars.com/api/?name=Regular+User&background=60b515&color=fff&size=200",
    "id": "08a8684b-db88-4b73-90a9-3cd1661f5468",
    "groups": ["users"]
  }
}`

		usersPath := filepath.Join(storageDir, "users.json")
		err = os.WriteFile(usersPath, []byte(usersJSON), 0644)
		require.NoError(t, err, "Failed to create users.json")

		progress("Created users.json with test data")

		// Create local workspace adapter
		adapter, err := local.NewAdapter(&local.Config{
			BasePath:   storageDir,
			DocsPath:   filepath.Join(storageDir, "docs"),
			DraftsPath: filepath.Join(storageDir, "drafts"),
			UsersPath:  usersPath,
		})
		require.NoError(t, err, "Failed to create local adapter")

		progress("Created local workspace adapter")

		// Create provider adapter
		providerAdapter := local.NewProviderAdapter(adapter)

		// Create mock server config
		mockServer := createMockServer(providerAdapter)

		progress("Created mock server configuration")

		// Test cases for different users
		testCases := []struct {
			name           string
			userEmail      string
			expectedName   string
			expectedGiven  string
			expectedFamily string
			expectedPhoto  string
			expectedID     string
		}{
			{
				name:           "Test User from users.json",
				userEmail:      "test@hermes.local",
				expectedName:   "Test User",
				expectedGiven:  "Test",
				expectedFamily: "User",
				expectedPhoto:  "https://ui-avatars.com/api/?name=Test+User&background=5c4ee5&color=fff&size=200",
				expectedID:     "08a8684b-db88-4b73-90a9-3cd1661f5466",
			},
			{
				name:           "Admin User from users.json",
				userEmail:      "admin@hermes.local",
				expectedName:   "Admin User",
				expectedGiven:  "Admin",
				expectedFamily: "User",
				expectedPhoto:  "https://ui-avatars.com/api/?name=Admin+User&background=1563ff&color=fff&size=200",
				expectedID:     "08a8684b-db88-4b73-90a9-3cd1661f5467",
			},
			{
				name:           "Regular User from users.json",
				userEmail:      "user@hermes.local",
				expectedName:   "Regular User",
				expectedGiven:  "Regular",
				expectedFamily: "User",
				expectedPhoto:  "https://ui-avatars.com/api/?name=Regular+User&background=60b515&color=fff&size=200",
				expectedID:     "08a8684b-db88-4b73-90a9-3cd1661f5468",
			},
		}

		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				progress(fmt.Sprintf("Testing /me endpoint for %s", tc.userEmail))

				// Create handler
				handler := api.MeHandler(mockServer)

				// Create request with user email in context (simulating authenticated user)
				req := httptest.NewRequest(http.MethodGet, "/api/v2/me", nil)
				reqCtx := context.WithValue(ctx, pkgauth.UserEmailKey, tc.userEmail)
				req = req.WithContext(reqCtx)

				// Create response recorder
				rr := httptest.NewRecorder()

				// Execute request
				handler.ServeHTTP(rr, req)

				// Assert response
				assert.Equal(t, http.StatusOK, rr.Code, "Expected HTTP 200 OK")

				// Parse response
				var resp api.MeGetResponse
				err := json.NewDecoder(rr.Body).Decode(&resp)
				require.NoError(t, err, "Failed to decode response")

				// Verify response contains expected user data from users.json
				assert.Equal(t, tc.userEmail, resp.Email, "Email should match")
				assert.Equal(t, tc.expectedName, resp.Name, "Name should match users.json")
				assert.Equal(t, tc.expectedGiven, resp.GivenName, "Given name should match users.json")
				assert.Equal(t, tc.expectedFamily, resp.FamilyName, "Family name should match users.json")
				assert.Equal(t, tc.expectedPhoto, resp.Picture, "Photo URL should match users.json")
				assert.True(t, resp.VerifiedEmail, "Email should be verified")

				progress(fmt.Sprintf("✓ Verified %s data from users.json", tc.userEmail))
			})
		}

		// Test unauthenticated request
		t.Run("Unauthenticated Request Returns 401", func(t *testing.T) {
			progress("Testing unauthenticated request")

			handler := api.MeHandler(mockServer)
			req := httptest.NewRequest(http.MethodGet, "/api/v2/me", nil)
			// Don't set user email in context - simulates unauthenticated request
			rr := httptest.NewRecorder()

			handler.ServeHTTP(rr, req)

			assert.Equal(t, http.StatusUnauthorized, rr.Code, "Expected HTTP 401 Unauthorized")
			progress("✓ Correctly rejected unauthenticated request")
		})

		// Test HEAD method (auth check)
		t.Run("HEAD Method Works For Auth Check", func(t *testing.T) {
			progress("Testing HEAD method for auth check")

			handler := api.MeHandler(mockServer)
			req := httptest.NewRequest(http.MethodHead, "/api/v2/me", nil)
			reqCtx := context.WithValue(ctx, pkgauth.UserEmailKey, "test@hermes.local")
			req = req.WithContext(reqCtx)
			rr := httptest.NewRecorder()

			handler.ServeHTTP(rr, req)

			assert.Equal(t, http.StatusOK, rr.Code, "Expected HTTP 200 OK for authenticated HEAD")
			assert.Empty(t, rr.Body.String(), "HEAD should return empty body")
			progress("✓ HEAD method works correctly")
		})

		// Test user not in users.json
		t.Run("User Not In UsersJSON Returns Error", func(t *testing.T) {
			progress("Testing user not found in users.json")

			handler := api.MeHandler(mockServer)
			req := httptest.NewRequest(http.MethodGet, "/api/v2/me", nil)
			reqCtx := context.WithValue(ctx, pkgauth.UserEmailKey, "nonexistent@hermes.local")
			req = req.WithContext(reqCtx)
			rr := httptest.NewRecorder()

			handler.ServeHTTP(rr, req)

			assert.Equal(t, http.StatusInternalServerError, rr.Code, "Expected HTTP 500 for user not found")
			progress("✓ Correctly handled missing user")
		})

		progress("All /me endpoint tests completed successfully")
	})
}

// createMockServer creates a minimal server.Server for testing MeHandler.
// Now that ProviderAdapter implements the full workspace.Provider interface,
// we can use it directly without a mock.
func createMockServer(providerAdapter *local.ProviderAdapter) server.Server {
	return server.Server{
		WorkspaceProvider: providerAdapter,
		Logger:            hclog.NewNullLogger(),
		Config: &config.Config{
			Email: &config.Email{
				Enabled: false,
			},
		},
		DB:   nil, // Not needed for /me endpoint
		Jira: nil, // Not needed for /me endpoint
	}
} // TestLocalWorkspace_MeEndpoint_WithAuthClaims tests the /me endpoint when using
// OIDC claims (e.g., from Dex) instead of workspace provider lookup.
// This simulates the authentication flow where user info comes from the OIDC token.
func TestLocalWorkspace_MeEndpoint_WithAuthClaims(t *testing.T) {
	WithTimeout(t, 1*time.Minute, 15*time.Second, func(ctx context.Context, progress func(string)) {
		progress("Testing /me endpoint with OIDC auth claims")

		// Create minimal local workspace adapter (users.json not needed for this test)
		storageDir := filepath.Join(os.TempDir(), fmt.Sprintf("hermes-me-claims-test-%d", os.Getpid()))
		err := os.MkdirAll(storageDir, 0755)
		require.NoError(t, err)
		defer os.RemoveAll(storageDir)

		adapter, err := local.NewAdapter(&local.Config{
			BasePath: storageDir,
		})
		require.NoError(t, err)

		providerAdapter := local.NewProviderAdapter(adapter)

		mockServer := createMockServer(providerAdapter)

		// Create request with OIDC claims in context (simulating Dex authentication)
		claims := &pkgauth.UserClaims{
			Email:             "dex-user@hermes.local",
			Name:              "Dex Authenticated User",
			GivenName:         "Dex",
			FamilyName:        "User",
			PreferredUsername: "dexuser",
			Groups:            []string{"users", "authenticated"},
		}

		handler := api.MeHandler(mockServer)
		req := httptest.NewRequest(http.MethodGet, "/api/v2/me", nil)

		// Set both email and claims in context (simulating successful OIDC auth)
		reqCtx := context.WithValue(ctx, pkgauth.UserEmailKey, claims.Email)
		reqCtx = context.WithValue(reqCtx, pkgauth.UserClaimsKey, claims)
		req = req.WithContext(reqCtx)

		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)

		// Assert response
		require.Equal(t, http.StatusOK, rr.Code, "Expected HTTP 200 OK")

		var resp api.MeGetResponse
		err = json.NewDecoder(rr.Body).Decode(&resp)
		require.NoError(t, err)

		// Verify response uses claims data (NOT users.json)
		assert.Equal(t, "dex-user@hermes.local", resp.Email)
		assert.Equal(t, "Dex Authenticated User", resp.Name)
		assert.Equal(t, "Dex", resp.GivenName)
		assert.Equal(t, "User", resp.FamilyName)
		assert.True(t, resp.VerifiedEmail)

		progress("✓ Successfully retrieved user info from OIDC claims")
	})
}
