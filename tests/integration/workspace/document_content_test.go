//go:build integration
// +build integration

// Package workspace contains integration tests for workspace adapters.
// This test verifies that the document content API (/api/v2/documents/:id/content)
// correctly handles GET and PUT operations when using the local workspace provider.
package workspace

import (
	"bytes"
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
	"github.com/hashicorp-forge/hermes/pkg/models"
	"github.com/hashicorp-forge/hermes/pkg/workspace"
	"github.com/hashicorp-forge/hermes/pkg/workspace/adapters/local"
	"github.com/hashicorp-forge/hermes/pkg/workspace/adapters/mock"
	"github.com/hashicorp/go-hclog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// TestLocalWorkspace_DocumentContentAPI verifies that the document content API
// correctly handles GET and PUT operations when using the local workspace provider.
func TestLocalWorkspace_DocumentContentAPI(t *testing.T) {
	WithTimeout(t, 2*time.Minute, 30*time.Second, func(ctx context.Context, progress func(string)) {
		// Setup: Create temporary storage directory
		storageDir := filepath.Join(os.TempDir(), fmt.Sprintf("hermes-content-test-%d", os.Getpid()))
		err := os.MkdirAll(storageDir, 0755)
		require.NoError(t, err, "Failed to create storage directory")
		defer os.RemoveAll(storageDir)

		progress("Created storage directory")

		// Create docs and drafts directories
		docsDir := filepath.Join(storageDir, "docs")
		draftsDir := filepath.Join(storageDir, "drafts")
		err = os.MkdirAll(docsDir, 0755)
		require.NoError(t, err)
		err = os.MkdirAll(draftsDir, 0755)
		require.NoError(t, err)

		// Create users.json with test data
		usersJSON := `{
  "owner@hermes.local": {
    "email": "owner@hermes.local",
    "name": "Document Owner",
    "given_name": "Document",
    "family_name": "Owner",
    "photo_url": "https://ui-avatars.com/api/?name=Document+Owner&background=5c4ee5&color=fff&size=200",
    "id": "owner-id-001",
    "groups": ["users"]
  },
  "contributor@hermes.local": {
    "email": "contributor@hermes.local",
    "name": "Document Contributor",
    "given_name": "Document",
    "family_name": "Contributor",
    "photo_url": "https://ui-avatars.com/api/?name=Document+Contributor&background=1563ff&color=fff&size=200",
    "id": "contributor-id-002",
    "groups": ["users"]
  },
  "other@hermes.local": {
    "email": "other@hermes.local",
    "name": "Other User",
    "given_name": "Other",
    "family_name": "User",
    "photo_url": "https://ui-avatars.com/api/?name=Other+User&background=60b515&color=fff&size=200",
    "id": "other-id-003",
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
			DocsPath:   docsDir,
			DraftsPath: draftsDir,
			UsersPath:  usersPath,
		})
		require.NoError(t, err, "Failed to create local adapter")

		progress("Created local workspace adapter")

		// Create provider adapter
		providerAdapter := local.NewProviderAdapter(adapter)

		// Create in-memory database for testing
		db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
		require.NoError(t, err, "Failed to create test database")

		// Run migrations for all models
		err = db.AutoMigrate(models.ModelsToAutoMigrate()...)
		require.NoError(t, err, "Failed to run migrations")

		progress("Created test database and ran migrations")

		// Create test document type
		docType := models.DocumentType{
			Name:        "RFC",
			LongName:    "Request for Comments",
			Description: "Test RFC document type",
		}
		result := db.Create(&docType)
		require.NoError(t, result.Error, "Failed to create document type")

		// Create test product
		product := models.Product{
			Name:         "Test Product",
			Abbreviation: "TP",
		}
		result = db.Create(&product)
		require.NoError(t, result.Error, "Failed to create product")

		// Create test users
		owner := models.User{
			EmailAddress: "owner@hermes.local",
		}
		result = db.Create(&owner)
		require.NoError(t, result.Error, "Failed to create owner user")

		contributor := models.User{
			EmailAddress: "contributor@hermes.local",
		}
		result = db.Create(&contributor)
		require.NoError(t, result.Error, "Failed to create contributor user")

		// Create test document record
		testDocID := "test-doc-rfc-001"
		testDoc := models.Document{
			GoogleFileID:   testDocID,
			Title:          "Test RFC Document",
			Status:         models.WIPDocumentStatus,
			DocumentTypeID: docType.ID,
			ProductID:      product.ID,
			Owner:          &owner,
			OwnerID:        &owner.ID,
			Contributors:   []*models.User{&contributor},
		}
		result = db.Create(&testDoc)
		require.NoError(t, result.Error, "Failed to create test document")

		progress(fmt.Sprintf("Created test document record: %s", testDocID))

		// Create document in local workspace storage with YAML frontmatter
		// Format: ---\n<yaml>\n---\n<content>
		initialContent := "# Test RFC Document\n\nThis is the initial content of the test document."

		// Create the document file with YAML frontmatter
		// Using the docs directory since this is a published document (not draft)
		docPath := filepath.Join(docsDir, testDocID+".md")
		docContent := `---
id: ` + testDocID + `
name: Test RFC Document
parent_folder_id: docs
created_time: 2024-01-01T00:00:00Z
modified_time: 2024-01-01T00:00:00Z
owner: owner@hermes.local
trashed: false
---
` + initialContent

		err = os.WriteFile(docPath, []byte(docContent), 0644)
		require.NoError(t, err, "Failed to create document file")

		progress("Created initial document content in local workspace") // Create mock server
		mockServer := server.Server{
			WorkspaceProvider: providerAdapter,
			Logger:            hclog.NewNullLogger(),
			Config: &config.Config{
				Email: &config.Email{
					Enabled: false,
				},
			},
			DB:   db,
			Jira: nil,
		}

		progress("Created mock server configuration")

		// Test 1: GET document content as owner
		t.Run("GET Document Content As Owner", func(t *testing.T) {
			progress("Testing GET /api/v2/documents/:id/content as owner")

			handler := api.DocumentContentHandler(mockServer)

			req := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/v2/documents/%s/content", testDocID), nil)
			reqCtx := context.WithValue(ctx, pkgauth.UserEmailKey, "owner@hermes.local")
			req = req.WithContext(reqCtx)

			rr := httptest.NewRecorder()
			handler.ServeHTTP(rr, req)

			assert.Equal(t, http.StatusOK, rr.Code, "Expected HTTP 200 OK")

			var resp api.DocumentContentResponse
			err := json.NewDecoder(rr.Body).Decode(&resp)
			require.NoError(t, err, "Failed to decode response")

			assert.Equal(t, initialContent, resp.Content, "Content should match initial content")

			progress("✓ Successfully retrieved document content as owner")
		})

		// Test 2: GET document content as contributor
		t.Run("GET Document Content As Contributor", func(t *testing.T) {
			progress("Testing GET /api/v2/documents/:id/content as contributor")

			handler := api.DocumentContentHandler(mockServer)

			req := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/v2/documents/%s/content", testDocID), nil)
			reqCtx := context.WithValue(ctx, pkgauth.UserEmailKey, "contributor@hermes.local")
			req = req.WithContext(reqCtx)

			rr := httptest.NewRecorder()
			handler.ServeHTTP(rr, req)

			assert.Equal(t, http.StatusOK, rr.Code, "Expected HTTP 200 OK")

			var resp api.DocumentContentResponse
			err := json.NewDecoder(rr.Body).Decode(&resp)
			require.NoError(t, err, "Failed to decode response")

			assert.Equal(t, initialContent, resp.Content, "Content should match initial content")

			progress("✓ Successfully retrieved document content as contributor")
		})

		// Test 3: GET document content as non-owner/non-contributor (should still work for GET)
		t.Run("GET Document Content As Other User", func(t *testing.T) {
			progress("Testing GET /api/v2/documents/:id/content as other user")

			handler := api.DocumentContentHandler(mockServer)

			req := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/v2/documents/%s/content", testDocID), nil)
			reqCtx := context.WithValue(ctx, pkgauth.UserEmailKey, "other@hermes.local")
			req = req.WithContext(reqCtx)

			rr := httptest.NewRecorder()
			handler.ServeHTTP(rr, req)

			// GET should work for all authenticated users (read-only)
			assert.Equal(t, http.StatusOK, rr.Code, "Expected HTTP 200 OK for GET by any authenticated user")

			progress("✓ Successfully retrieved document content as other user")
		})

		// Test 4: PUT document content as owner
		t.Run("PUT Document Content As Owner", func(t *testing.T) {
			progress("Testing PUT /api/v2/documents/:id/content as owner")

			handler := api.DocumentContentHandler(mockServer)

			updatedContent := "# Test RFC Document\n\nThis content has been updated by the owner."
			reqBody := api.DocumentContentRequest{
				Content: updatedContent,
			}
			reqJSON, err := json.Marshal(reqBody)
			require.NoError(t, err)

			req := httptest.NewRequest(http.MethodPut, fmt.Sprintf("/api/v2/documents/%s/content", testDocID), bytes.NewReader(reqJSON))
			req.Header.Set("Content-Type", "application/json")
			reqCtx := context.WithValue(ctx, pkgauth.UserEmailKey, "owner@hermes.local")
			req = req.WithContext(reqCtx)

			rr := httptest.NewRecorder()
			handler.ServeHTTP(rr, req)

			assert.Equal(t, http.StatusOK, rr.Code, "Expected HTTP 200 OK")

			// Verify content was actually updated
			storedContent, err := adapter.DocumentStorage().GetDocumentContent(ctx, testDocID)
			require.NoError(t, err)
			assert.Equal(t, updatedContent, storedContent, "Content should be updated in storage")

			progress("✓ Successfully updated document content as owner")
		})

		// Test 5: PUT document content as contributor
		t.Run("PUT Document Content As Contributor", func(t *testing.T) {
			progress("Testing PUT /api/v2/documents/:id/content as contributor")

			handler := api.DocumentContentHandler(mockServer)

			contributorContent := "# Test RFC Document\n\nThis content has been updated by a contributor."
			reqBody := api.DocumentContentRequest{
				Content: contributorContent,
			}
			reqJSON, err := json.Marshal(reqBody)
			require.NoError(t, err)

			req := httptest.NewRequest(http.MethodPut, fmt.Sprintf("/api/v2/documents/%s/content", testDocID), bytes.NewReader(reqJSON))
			req.Header.Set("Content-Type", "application/json")
			reqCtx := context.WithValue(ctx, pkgauth.UserEmailKey, "contributor@hermes.local")
			req = req.WithContext(reqCtx)

			rr := httptest.NewRecorder()
			handler.ServeHTTP(rr, req)

			assert.Equal(t, http.StatusOK, rr.Code, "Expected HTTP 200 OK")

			// Verify content was actually updated
			storedContent, err := adapter.DocumentStorage().GetDocumentContent(ctx, testDocID)
			require.NoError(t, err)
			assert.Equal(t, contributorContent, storedContent, "Content should be updated in storage")

			progress("✓ Successfully updated document content as contributor")
		})

		// Test 6: PUT document content as non-owner/non-contributor (should fail)
		t.Run("PUT Document Content As Other User Should Fail", func(t *testing.T) {
			progress("Testing PUT /api/v2/documents/:id/content as unauthorized user")

			handler := api.DocumentContentHandler(mockServer)

			unauthorizedContent := "# Test RFC Document\n\nThis should not be allowed."
			reqBody := api.DocumentContentRequest{
				Content: unauthorizedContent,
			}
			reqJSON, err := json.Marshal(reqBody)
			require.NoError(t, err)

			req := httptest.NewRequest(http.MethodPut, fmt.Sprintf("/api/v2/documents/%s/content", testDocID), bytes.NewReader(reqJSON))
			req.Header.Set("Content-Type", "application/json")
			reqCtx := context.WithValue(ctx, pkgauth.UserEmailKey, "other@hermes.local")
			req = req.WithContext(reqCtx)

			rr := httptest.NewRecorder()
			handler.ServeHTTP(rr, req)

			assert.Equal(t, http.StatusForbidden, rr.Code, "Expected HTTP 403 Forbidden")

			progress("✓ Correctly rejected unauthorized update attempt")
		})

		// Test 7: GET non-existent document
		t.Run("GET Non-Existent Document Returns 404", func(t *testing.T) {
			progress("Testing GET for non-existent document")

			handler := api.DocumentContentHandler(mockServer)

			req := httptest.NewRequest(http.MethodGet, "/api/v2/documents/non-existent-doc/content", nil)
			reqCtx := context.WithValue(ctx, pkgauth.UserEmailKey, "owner@hermes.local")
			req = req.WithContext(reqCtx)

			rr := httptest.NewRecorder()
			handler.ServeHTTP(rr, req)

			assert.Equal(t, http.StatusNotFound, rr.Code, "Expected HTTP 404 Not Found")

			progress("✓ Correctly returned 404 for non-existent document")
		})

		// Test 8: PUT with invalid JSON
		t.Run("PUT With Invalid JSON Returns 400", func(t *testing.T) {
			progress("Testing PUT with invalid JSON")

			handler := api.DocumentContentHandler(mockServer)

			req := httptest.NewRequest(http.MethodPut, fmt.Sprintf("/api/v2/documents/%s/content", testDocID), bytes.NewReader([]byte("invalid json")))
			req.Header.Set("Content-Type", "application/json")
			reqCtx := context.WithValue(ctx, pkgauth.UserEmailKey, "owner@hermes.local")
			req = req.WithContext(reqCtx)

			rr := httptest.NewRecorder()
			handler.ServeHTTP(rr, req)

			assert.Equal(t, http.StatusBadRequest, rr.Code, "Expected HTTP 400 Bad Request")

			progress("✓ Correctly rejected invalid JSON")
		})

		// Test 9: Verify persistence across multiple GET requests
		t.Run("Content Persists Across Multiple GET Requests", func(t *testing.T) {
			progress("Testing content persistence")

			handler := api.DocumentContentHandler(mockServer)

			// Get content first time
			req1 := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/v2/documents/%s/content", testDocID), nil)
			reqCtx1 := context.WithValue(ctx, pkgauth.UserEmailKey, "owner@hermes.local")
			req1 = req1.WithContext(reqCtx1)
			rr1 := httptest.NewRecorder()
			handler.ServeHTTP(rr1, req1)

			var resp1 api.DocumentContentResponse
			err := json.NewDecoder(rr1.Body).Decode(&resp1)
			require.NoError(t, err)

			// Get content second time
			req2 := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/v2/documents/%s/content", testDocID), nil)
			reqCtx2 := context.WithValue(ctx, pkgauth.UserEmailKey, "contributor@hermes.local")
			req2 = req2.WithContext(reqCtx2)
			rr2 := httptest.NewRecorder()
			handler.ServeHTTP(rr2, req2)

			var resp2 api.DocumentContentResponse
			err = json.NewDecoder(rr2.Body).Decode(&resp2)
			require.NoError(t, err)

			assert.Equal(t, resp1.Content, resp2.Content, "Content should be consistent across requests")

			progress("✓ Content persists correctly across multiple requests")
		})

		progress("All document content API tests completed successfully")
	})
}

// mockProviderWithCapabilities wraps a mock provider and adds capabilities interface
type mockProviderWithCapabilities struct {
	workspace.Provider
	supportsEditing bool
}

func (m *mockProviderWithCapabilities) SupportsContentEditing() bool {
	return m.supportsEditing
}

// TestUnsupportedProvider_DocumentContentAPI verifies that the document content API
// correctly returns HTTP 501 (Not Implemented) when the workspace provider does not
// support content editing.
func TestUnsupportedProvider_DocumentContentAPI(t *testing.T) {
	WithTimeout(t, 1*time.Minute, 15*time.Second, func(ctx context.Context, progress func(string)) {
		progress("Testing document content API with unsupported provider")

		// Create mock workspace provider that does NOT support content editing
		mockProvider := &mockProviderWithCapabilities{
			Provider:        mock.NewAdapter(),
			supportsEditing: false,
		}

		// Create minimal mock server
		mockServer := server.Server{
			WorkspaceProvider: mockProvider,
			Logger:            hclog.NewNullLogger(),
			Config: &config.Config{
				Email: &config.Email{
					Enabled: false,
				},
			},
			DB:   nil, // Not needed for this test
			Jira: nil,
		}

		handler := api.DocumentContentHandler(mockServer)

		// Test GET request with unsupported provider
		t.Run("GET With Unsupported Provider Returns 501", func(t *testing.T) {
			progress("Testing GET with unsupported provider")

			req := httptest.NewRequest(http.MethodGet, "/api/v2/documents/test-doc/content", nil)
			reqCtx := context.WithValue(ctx, pkgauth.UserEmailKey, "test@hermes.local")
			req = req.WithContext(reqCtx)

			rr := httptest.NewRecorder()
			handler.ServeHTTP(rr, req)

			assert.Equal(t, http.StatusNotImplemented, rr.Code, "Expected HTTP 501 Not Implemented")

			progress("✓ GET correctly returned 501 for unsupported provider")
		})

		// Test PUT request with unsupported provider
		t.Run("PUT With Unsupported Provider Returns 501", func(t *testing.T) {
			progress("Testing PUT with unsupported provider")

			reqBody := api.DocumentContentRequest{
				Content: "Test content",
			}
			reqJSON, err := json.Marshal(reqBody)
			require.NoError(t, err)

			req := httptest.NewRequest(http.MethodPut, "/api/v2/documents/test-doc/content", bytes.NewReader(reqJSON))
			req.Header.Set("Content-Type", "application/json")
			reqCtx := context.WithValue(ctx, pkgauth.UserEmailKey, "test@hermes.local")
			req = req.WithContext(reqCtx)

			rr := httptest.NewRecorder()
			handler.ServeHTTP(rr, req)

			assert.Equal(t, http.StatusNotImplemented, rr.Code, "Expected HTTP 501 Not Implemented")

			progress("✓ PUT correctly returned 501 for unsupported provider")
		})

		progress("All unsupported provider tests completed successfully")
	})
}
