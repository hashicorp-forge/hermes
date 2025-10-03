//go:build integration
// +build integration

package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/hashicorp-forge/hermes/internal/api"
	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp/go-hclog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestAPI_DocumentTypesHandler tests the GET /api/v1/document-types endpoint
func TestAPI_DocumentTypesHandler(t *testing.T) {
	suite := NewIntegrationSuite(t)
	defer suite.Cleanup()

	// Setup test config with document types
	cfg := config.Config{
		DocumentTypes: &config.DocumentTypes{
			DocumentType: []*config.DocumentType{
				{
					Name:     "RFC",
					LongName: "Request for Comments",
				},
				{
					Name:     "PRD",
					LongName: "Product Requirements Document",
				},
				{
					Name:     "FRD",
					LongName: "Functional Requirements Document",
				},
			},
		},
	}

	log := hclog.NewNullLogger()
	handler := api.DocumentTypesHandler(cfg, log)

	t.Run("GET returns document types", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/v1/document-types", nil)
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Equal(t, "application/json", w.Header().Get("Content-Type"))

		var docTypes []config.DocumentType
		err := json.Unmarshal(w.Body.Bytes(), &docTypes)
		require.NoError(t, err)

		assert.Len(t, docTypes, 3)
		assert.Equal(t, "RFC", docTypes[0].Name)
		assert.Equal(t, "Request for Comments", docTypes[0].LongName)
		assert.Equal(t, "PRD", docTypes[1].Name)
		assert.Equal(t, "FRD", docTypes[2].Name)
	})

	t.Run("POST returns method not allowed", func(t *testing.T) {
		req := httptest.NewRequest("POST", "/api/v1/document-types", nil)
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		assert.Equal(t, http.StatusMethodNotAllowed, w.Code)
	})

	t.Run("PUT returns method not allowed", func(t *testing.T) {
		req := httptest.NewRequest("PUT", "/api/v1/document-types", nil)
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		assert.Equal(t, http.StatusMethodNotAllowed, w.Code)
	})

	t.Run("DELETE returns method not allowed", func(t *testing.T) {
		req := httptest.NewRequest("DELETE", "/api/v1/document-types", nil)
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		assert.Equal(t, http.StatusMethodNotAllowed, w.Code)
	})

	t.Run("Empty document types config", func(t *testing.T) {
		emptyCfg := config.Config{
			DocumentTypes: &config.DocumentTypes{
				DocumentType: []*config.DocumentType{},
			},
		}
		emptyHandler := api.DocumentTypesHandler(emptyCfg, log)

		req := httptest.NewRequest("GET", "/api/v1/document-types", nil)
		w := httptest.NewRecorder()

		emptyHandler.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var docTypes []config.DocumentType
		err := json.Unmarshal(w.Body.Bytes(), &docTypes)
		require.NoError(t, err)
		assert.Len(t, docTypes, 0)
	})
}

// TestAPI_ProductsHandler tests the GET /api/v1/products endpoint
func TestAPI_ProductsHandler(t *testing.T) {
	suite := NewIntegrationSuite(t)
	defer suite.Cleanup()

	t.Run("GET returns products data", func(t *testing.T) {
		// The ProductsHandler reads from Algolia, which we need to mock or
		// we need to use the local adapter. For now, we'll test the handler
		// in a more unit-test fashion.
		t.Skip("ProductsHandler requires Algolia mock - will implement with mock search")

		// TODO: When implementing:
		// - Create test products in database
		// - Mock Algolia client to return products
		// - Test handler returns correct JSON
	})
}

// TestAPI_AnalyticsHandler tests the POST /api/v1/analytics endpoint
func TestAPI_AnalyticsHandler(t *testing.T) {
	suite := NewIntegrationSuite(t)
	defer suite.Cleanup()

	log := hclog.NewNullLogger()
	handler := api.AnalyticsHandler(log)

	t.Run("POST valid analytics event with document_id", func(t *testing.T) {
		// Valid analytics request
		body := strings.NewReader(`{"document_id": "test-doc-123", "product_name": "Boundary"}`)
		req := httptest.NewRequest("POST", "/api/v1/analytics", body)
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Equal(t, "application/json", w.Header().Get("Content-Type"))

		// Decode response
		var resp map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &resp)
		require.NoError(t, err)
		assert.Equal(t, true, resp["recorded"])
	})

	t.Run("POST analytics event without document_id", func(t *testing.T) {
		// Request without document_id should not be recorded
		body := strings.NewReader(`{"product_name": "Boundary"}`)
		req := httptest.NewRequest("POST", "/api/v1/analytics", body)
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var resp map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &resp)
		require.NoError(t, err)
		assert.Equal(t, false, resp["recorded"])
	})

	t.Run("POST empty body returns bad request", func(t *testing.T) {
		// Empty body should return 400
		req := httptest.NewRequest("POST", "/api/v1/analytics", nil)
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		// Analytics endpoint requires valid JSON body
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("POST invalid JSON returns bad request", func(t *testing.T) {
		body := strings.NewReader(`{invalid json}`)
		req := httptest.NewRequest("POST", "/api/v1/analytics", body)
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("GET returns method not allowed", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/v1/analytics", nil)
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		assert.Equal(t, http.StatusMethodNotAllowed, w.Code)
	})

	t.Run("PUT returns method not allowed", func(t *testing.T) {
		req := httptest.NewRequest("PUT", "/api/v1/analytics", nil)
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		assert.Equal(t, http.StatusMethodNotAllowed, w.Code)
	})

	t.Run("DELETE returns method not allowed", func(t *testing.T) {
		req := httptest.NewRequest("DELETE", "/api/v1/analytics", nil)
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		assert.Equal(t, http.StatusMethodNotAllowed, w.Code)
	})
} // TestAPI_DocumentHandler tests the /api/v1/documents/:id endpoint
func TestAPI_DocumentHandler(t *testing.T) {
	t.Skip("DocumentHandler requires full integration setup - see documents_test.go")
	// This test is complex because DocumentHandler:
	// 1. Requires authentication
	// 2. Uses both database and Algolia search
	// 3. Has complex GET/PATCH/DELETE logic
	// Will be implemented after we have better search mocking
}

// TestAPI_DraftsHandler tests the /api/v1/drafts endpoint
func TestAPI_DraftsHandler(t *testing.T) {
	t.Skip("DraftsHandler requires full integration setup with Google Workspace")
	// DraftsHandler is one of the most complex endpoints:
	// 1. Requires authentication
	// 2. Uses Google Drive API
	// 3. Uses database
	// 4. Uses search (Algolia/Meilisearch)
	// Will be implemented with proper mocking
}

// TestAPI_MeHandler tests the /api/v1/me endpoint
func TestAPI_MeHandler(t *testing.T) {
	t.Skip("MeHandler requires authentication setup")
	// MeHandler tests will be added once we have proper auth mocking
}

// TestAPI_ReviewsHandler tests the /api/v1/reviews endpoint
func TestAPI_ReviewsHandler(t *testing.T) {
	t.Skip("ReviewsHandler requires full integration setup")
	// ReviewsHandler is complex:
	// 1. Requires authentication
	// 2. Uses database with complex relations
	// 3. Uses email service
	// 4. Uses Google Drive API
	// Will be implemented with proper mocking
}

// TestAPI_ApprovalsHandler tests the /api/v1/approvals endpoint
func TestAPI_ApprovalsHandler(t *testing.T) {
	t.Skip("ApprovalsHandler requires full integration setup")
	// ApprovalsHandler is complex:
	// 1. Requires authentication
	// 2. Uses database
	// 3. Updates document status
	// 4. Triggers workflows
	// Will be implemented with proper mocking
}
