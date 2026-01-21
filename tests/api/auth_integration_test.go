//go:build integration
// +build integration

package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	pkgauth "github.com/hashicorp-forge/hermes/pkg/auth"
	mockadapter "github.com/hashicorp-forge/hermes/pkg/auth/adapters/mock"
	"github.com/hashicorp-forge/hermes/pkg/models"
	"github.com/hashicorp-forge/hermes/tests/api/fixtures"
	"github.com/hashicorp/go-hclog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestMockAuth_MeEndpoint tests the /me endpoint with mock authentication.
// This demonstrates end-to-end testing with the mock auth adapter.
func TestMockAuth_MeEndpoint(t *testing.T) {
	suite := NewIntegrationSuite(t)
	defer suite.Cleanup()

	testEmail := "testuser@example.com"

	// Create a test user in the database
	_ = fixtures.NewUser().
		WithEmail(testEmail).
		Create(t, suite.DB)

	// Create mock auth adapter
	mockAuth := mockadapter.NewAdapterWithEmail(testEmail)
	log := hclog.NewNullLogger()

	// Create a test handler that simulates the /me endpoint behavior
	handler := pkgauth.Middleware(mockAuth, log)(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Extract user email using the new type-safe helper
			userEmail, ok := pkgauth.GetUserEmail(r.Context())
			if !ok {
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}

			// Verify email matches expected
			assert.Equal(t, testEmail, userEmail)

			// Return user info (similar to actual /me endpoint)
			response := map[string]interface{}{
				"email":         userEmail,
				"verified":      true,
				"authenticated": true,
			}

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(response)
		}),
	)

	// Create test request
	req := httptest.NewRequest("GET", "/api/v2/me", nil)
	rr := httptest.NewRecorder()

	// Execute request
	handler.ServeHTTP(rr, req)

	// Verify response
	assert.Equal(t, http.StatusOK, rr.Code)

	var response map[string]interface{}
	err := json.NewDecoder(rr.Body).Decode(&response)
	require.NoError(t, err)

	assert.Equal(t, testEmail, response["email"])
	assert.Equal(t, true, response["verified"])
	assert.Equal(t, true, response["authenticated"])

	// Verify user exists in database
	var dbUser models.User
	err = suite.DB.Where("email_address = ?", testEmail).First(&dbUser).Error
	require.NoError(t, err)
	assert.Equal(t, testEmail, dbUser.EmailAddress)
}

// TestMockAuth_HeaderBased tests authentication via custom header.
// This demonstrates the flexible mock auth adapter.
func TestMockAuth_HeaderBased(t *testing.T) {
	suite := NewIntegrationSuite(t)
	defer suite.Cleanup()

	// Create mock auth that reads from header
	mockAuth := mockadapter.NewAdapterWithHeader("X-Test-User-Email")
	log := hclog.NewNullLogger()

	handler := pkgauth.Middleware(mockAuth, log)(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userEmail := pkgauth.MustGetUserEmail(r.Context())
			w.Header().Set("Content-Type", "text/plain")
			w.Write([]byte(userEmail))
		}),
	)

	tests := []struct {
		name         string
		headerValue  string
		expectStatus int
		expectBody   string
	}{
		{
			name:         "Valid email in header",
			headerValue:  "admin@example.com",
			expectStatus: http.StatusOK,
			expectBody:   "admin@example.com",
		},
		{
			name:         "Different email",
			headerValue:  "user@example.com",
			expectStatus: http.StatusOK,
			expectBody:   "user@example.com",
		},
		{
			name:         "No header provided",
			headerValue:  "",
			expectStatus: http.StatusUnauthorized,
			expectBody:   "Unauthorized\n",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", "/test", nil)
			if tt.headerValue != "" {
				req.Header.Set("X-Test-User-Email", tt.headerValue)
			}
			rr := httptest.NewRecorder()

			handler.ServeHTTP(rr, req)

			assert.Equal(t, tt.expectStatus, rr.Code)
			assert.Equal(t, tt.expectBody, rr.Body.String())
		})
	}
}

// TestMockAuth_DocumentCreation tests document creation with authenticated user.
// This is a more realistic end-to-end scenario.
func TestMockAuth_DocumentCreation(t *testing.T) {
	suite := NewIntegrationSuite(t)
	defer suite.Cleanup()

	ownerEmail := "owner@example.com"

	// Create test users
	_ = fixtures.NewUser().
		WithEmail(ownerEmail).
		Create(t, suite.DB)

	contributor := fixtures.NewUser().
		WithEmail("contributor@example.com").
		Create(t, suite.DB)

	// Create mock auth for owner
	mockAuth := mockadapter.NewAdapterWithEmail(ownerEmail)
	log := hclog.NewNullLogger()

	// Simulate document creation handler
	handler := pkgauth.Middleware(mockAuth, log)(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userEmail := pkgauth.MustGetUserEmail(r.Context())

			// Create a document owned by the authenticated user
			doc := fixtures.NewDocument().
				WithGoogleFileID("test-doc-auth-"+time.Now().Format("20060102150405")).
				WithTitle("Test Document with Auth").
				WithDocType("RFC").
				WithStatus(models.WIPDocumentStatus).
				WithOwner(userEmail).
				WithContributor(contributor.EmailAddress).
				Create(t, suite.DB)

			// Verify the document was created with correct owner
			assert.Equal(t, userEmail, doc.Owner.EmailAddress)
			// Check Contributors array contains the contributor user
			var hasContributor bool
			for _, c := range doc.Contributors {
				if c.EmailAddress == contributor.EmailAddress {
					hasContributor = true
					break
				}
			}
			assert.True(t, hasContributor, "document should have contributor")

			// Return document info
			response := map[string]interface{}{
				"id":     doc.GoogleFileID,
				"title":  doc.Title,
				"owner":  doc.Owner.EmailAddress,
				"status": int(doc.Status),
			}

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(response)
		}),
	)

	// Execute request
	req := httptest.NewRequest("POST", "/api/v2/drafts", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	// Verify response
	assert.Equal(t, http.StatusOK, rr.Code)

	var response map[string]interface{}
	err := json.NewDecoder(rr.Body).Decode(&response)
	require.NoError(t, err)

	assert.Equal(t, ownerEmail, response["owner"])
	assert.Equal(t, "Test Document with Auth", response["title"])
	assert.Equal(t, float64(models.WIPDocumentStatus), response["status"]) // JSON numbers decode as float64

	// Verify in database
	var dbDoc models.Document
	err = suite.DB.
		Preload("Owner").
		Preload("Contributors").
		Where("google_file_id = ?", response["id"]).
		First(&dbDoc).Error
	require.NoError(t, err)

	assert.Equal(t, ownerEmail, dbDoc.Owner.EmailAddress)
	assert.Equal(t, 1, len(dbDoc.Contributors))
	assert.Equal(t, contributor.EmailAddress, dbDoc.Contributors[0].EmailAddress)
}

// TestMockAuth_AuthorizationFailure tests that unauthorized users are rejected.
func TestMockAuth_AuthorizationFailure(t *testing.T) {
	suite := NewIntegrationSuite(t)
	defer suite.Cleanup()

	ownerEmail := "owner@example.com"
	otherEmail := "other@example.com"

	// Create document owned by owner
	doc := fixtures.NewDocument().
		WithGoogleFileID("test-doc-owned").
		WithTitle("Owner's Document").
		WithOwner(ownerEmail).
		Create(t, suite.DB)

	// Try to access as different user
	mockAuth := mockadapter.NewAdapterWithEmail(otherEmail)
	log := hclog.NewNullLogger()

	handler := pkgauth.Middleware(mockAuth, log)(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userEmail := pkgauth.MustGetUserEmail(r.Context())

			// Check authorization - user must be owner
			if doc.Owner.EmailAddress != userEmail {
				http.Error(w, "Forbidden: Not document owner", http.StatusForbidden)
				return
			}

			w.WriteHeader(http.StatusOK)
		}),
	)

	// Execute request
	req := httptest.NewRequest("PATCH", "/api/v2/documents/"+doc.GoogleFileID, nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	// Should be forbidden
	assert.Equal(t, http.StatusForbidden, rr.Code)
	assert.Contains(t, rr.Body.String(), "Forbidden")
}

// TestMockAuth_MultipleUsers tests switching between different authenticated users.
func TestMockAuth_MultipleUsers(t *testing.T) {
	suite := NewIntegrationSuite(t)
	defer suite.Cleanup()

	users := []string{
		"admin@example.com",
		"user1@example.com",
		"user2@example.com",
	}

	// Create users in database
	for _, email := range users {
		fixtures.NewUser().WithEmail(email).Create(t, suite.DB)
	}

	log := hclog.NewNullLogger()

	// Test each user can authenticate
	for _, email := range users {
		t.Run("User_"+email, func(t *testing.T) {
			mockAuth := mockadapter.NewAdapterWithEmail(email)

			handler := pkgauth.Middleware(mockAuth, log)(
				http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					userEmail := pkgauth.MustGetUserEmail(r.Context())
					w.Write([]byte(userEmail))
				}),
			)

			req := httptest.NewRequest("GET", "/test", nil)
			rr := httptest.NewRecorder()
			handler.ServeHTTP(rr, req)

			assert.Equal(t, http.StatusOK, rr.Code)
			assert.Equal(t, email, rr.Body.String())
		})
	}
}

// TestMockAuth_FailAuthentication tests the failure mode of mock auth.
func TestMockAuth_FailAuthentication(t *testing.T) {
	suite := NewIntegrationSuite(t)
	defer suite.Cleanup()

	// Create mock auth that always fails
	mockAuth := mockadapter.NewAdapter()
	mockAuth.FailAuthentication = true

	log := hclog.NewNullLogger()

	handler := pkgauth.Middleware(mockAuth, log)(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// This should never be reached
			t.Error("Handler should not be called when auth fails")
			w.WriteHeader(http.StatusOK)
		}),
	)

	// Execute request
	req := httptest.NewRequest("GET", "/test", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	// Should be unauthorized
	assert.Equal(t, http.StatusUnauthorized, rr.Code)
}
