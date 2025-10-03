//go:build integration

package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	apiv2 "github.com/hashicorp-forge/hermes/internal/api/v2"
	"github.com/hashicorp-forge/hermes/internal/server"
	"github.com/hashicorp-forge/hermes/internal/structs"
	"github.com/hashicorp-forge/hermes/pkg/algolia"
	pkgauth "github.com/hashicorp-forge/hermes/pkg/auth"
	mockadapter "github.com/hashicorp-forge/hermes/pkg/auth/adapters/mock"
	gw "github.com/hashicorp-forge/hermes/pkg/workspace/adapters/google"
	"github.com/hashicorp/go-hclog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestV2Products_Get tests the GET /api/v2/products endpoint with mock auth.
func TestV2Products_Get(t *testing.T) {
	suite := NewIntegrationSuite(t)
	defer suite.Cleanup()

	testEmail := "testuser@example.com"

	// Create mock auth adapter
	mockAuth := mockadapter.NewAdapterWithEmail(testEmail)
	log := hclog.NewNullLogger()

	// Create server components with search provider
	srv := &server.Server{
		AlgoSearch:     &algolia.Client{},
		AlgoWrite:      &algolia.Client{},
		SearchProvider: suite.SearchProvider, // Use Meilisearch adapter
		Config:         suite.Config,
		DB:             suite.DB,
		GWService:      &gw.Service{},
		Logger:         log,
	}

	// Wrap the products handler with auth middleware
	handler := pkgauth.Middleware(mockAuth, log)(apiv2.ProductsHandler(*srv))

	// Create test request
	req := httptest.NewRequest("GET", "/api/v2/products", nil)
	rr := httptest.NewRecorder()

	// Execute request
	handler.ServeHTTP(rr, req)

	// Verify response
	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))

	// Decode response
	var products map[string]structs.ProductData
	err := json.NewDecoder(rr.Body).Decode(&products)
	require.NoError(t, err)

	// Response should be a valid map (may be empty in test environment)
	assert.NotNil(t, products)
}

// TestV2Products_MethodNotAllowed tests that non-GET methods are rejected.
func TestV2Products_MethodNotAllowed(t *testing.T) {
	suite := NewIntegrationSuite(t)
	defer suite.Cleanup()

	testEmail := "testuser@example.com"
	mockAuth := mockadapter.NewAdapterWithEmail(testEmail)
	log := hclog.NewNullLogger()

	srv := &server.Server{
		AlgoSearch:     &algolia.Client{},
		AlgoWrite:      &algolia.Client{},
		SearchProvider: suite.SearchProvider,
		Config:         suite.Config,
		DB:             suite.DB,
		GWService:      &gw.Service{},
		Logger:         log,
	}

	handler := pkgauth.Middleware(mockAuth, log)(apiv2.ProductsHandler(*srv))

	testCases := []struct {
		method string
	}{
		{"POST"},
		{"PUT"},
		{"PATCH"},
		{"DELETE"},
	}

	for _, tc := range testCases {
		t.Run(tc.method, func(t *testing.T) {
			req := httptest.NewRequest(tc.method, "/api/v2/products", nil)
			rr := httptest.NewRecorder()
			handler.ServeHTTP(rr, req)
			assert.Equal(t, http.StatusMethodNotAllowed, rr.Code, "Expected 405 Method Not Allowed")
		})
	}
}

// TestV2Products_Unauthorized tests that unauthenticated requests are rejected.
func TestV2Products_Unauthorized(t *testing.T) {
	suite := NewIntegrationSuite(t)
	defer suite.Cleanup()

	// Create auth adapter that will fail authentication
	mockAuth := mockadapter.NewAdapter()
	mockAuth.FailAuthentication = true
	log := hclog.NewNullLogger()

	srv := &server.Server{
		AlgoSearch:     &algolia.Client{},
		AlgoWrite:      &algolia.Client{},
		SearchProvider: suite.SearchProvider,
		Config:         suite.Config,
		DB:             suite.DB,
		GWService:      &gw.Service{},
		Logger:         log,
	}

	handler := pkgauth.Middleware(mockAuth, log)(apiv2.ProductsHandler(*srv))

	req := httptest.NewRequest("GET", "/api/v2/products", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	// Should be unauthorized
	assert.Equal(t, http.StatusUnauthorized, rr.Code)
}
