//go:build integration
// +build integration

package api

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/hashicorp-forge/hermes/internal/api"
	apiv2 "github.com/hashicorp-forge/hermes/internal/api/v2"
	"github.com/hashicorp-forge/hermes/internal/server"
	pkgauth "github.com/hashicorp-forge/hermes/pkg/auth"
	mockauth "github.com/hashicorp-forge/hermes/pkg/auth/adapters/mock"
	"github.com/hashicorp-forge/hermes/pkg/models"
	"github.com/hashicorp-forge/hermes/pkg/search"
	mock "github.com/hashicorp-forge/hermes/pkg/workspace/adapters/mock"
	"github.com/hashicorp-forge/hermes/tests/api/fixtures"
	"github.com/hashicorp/go-hclog"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"google.golang.org/api/docs/v1"
)

// testWriter adapts testing.T to io.Writer for hclog
type testWriter struct {
	t *testing.T
}

func (tw testWriter) Write(p []byte) (n int, err error) {
	tw.t.Log(string(p))
	return len(p), nil
}

// TestCompleteIntegration_DocumentLifecycle demonstrates complete end-to-end testing
// with all components properly injected:
// - PostgreSQL for data persistence
// - Meilisearch for search functionality
// - Mock workspace provider for document storage
// - Mock auth adapter for authentication
func TestCompleteIntegration_DocumentLifecycle(t *testing.T) {
	// Setup: Create test suite with all real components
	suite := NewIntegrationSuite(t)
	defer suite.Cleanup()

	testEmail := "doc-creator@hashicorp.com"

	// Create test user
	user := fixtures.NewUser().
		WithEmail(testEmail).
		Create(t, suite.DB)

	// Create test product
	product := fixtures.NewProduct().
		WithName("Vault").
		WithAbbreviation("VAULT").
		Create(t, suite.DB)

	// Setup mock authentication
	mockAuth := mockauth.NewAdapterWithEmail(testEmail)
	// Use test logger to see errors
	log := hclog.New(&hclog.LoggerOptions{
		Name:   "test",
		Level:  hclog.Debug,
		Output: testWriter{t},
	})

	// Setup: Pre-populate mock workspace with template files
	// Get the mock adapter so we can add files directly
	mockWorkspace := suite.WorkspaceProvider.(*mock.Adapter)

	// Create RFC template file in mock workspace
	// Use the template ID from suite config (already set to "test-template-id")
	rfcTemplateID := suite.Config.DocumentTypes.DocumentType[0].Template
	mockWorkspace.WithFile(rfcTemplateID, "RFC Template", "application/vnd.google-apps.document").
		WithFileContent(rfcTemplateID, "# RFC Template\n\n## Summary\n").
		WithDocument(rfcTemplateID, &docs.Document{
			DocumentId: rfcTemplateID,
			Title:      "RFC Template",
			Body: &docs.Body{
				Content: []*docs.StructuralElement{
					{
						Paragraph: &docs.Paragraph{
							Elements: []*docs.ParagraphElement{
								{TextRun: &docs.TextRun{Content: "RFC Template\n"}},
							},
						},
					},
				},
			},
		})

	// Create PRD template file (if we add more document types later)
	prdTemplateID := suite.Config.DocumentTypes.DocumentType[1].Template
	if prdTemplateID != rfcTemplateID {
		mockWorkspace.WithFile(prdTemplateID, "PRD Template", "application/vnd.google-apps.document").
			WithFileContent(prdTemplateID, "# PRD Template\n\n## Overview\n").
			WithDocument(prdTemplateID, &docs.Document{
				DocumentId: prdTemplateID,
				Title:      "PRD Template",
				Body: &docs.Body{
					Content: []*docs.StructuralElement{
						{
							Paragraph: &docs.Paragraph{
								Elements: []*docs.ParagraphElement{
									{TextRun: &docs.TextRun{Content: "PRD Template\n"}},
								},
							},
						},
					},
				},
			})
	}

	// Note: Template IDs are already set in suite.Config.DocumentTypes, no need to update	// Create server with all dependencies injected
	srv := server.Server{
		Config:            suite.Config,
		DB:                suite.DB,
		SearchProvider:    suite.SearchProvider,
		WorkspaceProvider: suite.WorkspaceProvider,
		Logger:            log,
	}

	t.Run("Create Draft Document", func(t *testing.T) {
		// Test creating a draft via API
		handler := pkgauth.Middleware(mockAuth, log)(
			apiv2.DraftsHandler(srv),
		)

		reqBody := map[string]interface{}{
			"title":   "Test RFC: Complete Integration",
			"docType": "RFC",
			"product": "Vault",
			"summary": "This is a test document for complete integration testing",
		}
		bodyBytes, err := json.Marshal(reqBody)
		require.NoError(t, err)

		req := httptest.NewRequest("POST", "/api/v2/drafts", bytes.NewReader(bodyBytes))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		// Verify response
		if w.Code != http.StatusOK {
			t.Logf("Response body: %s", w.Body.String())
		}
		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		err = json.NewDecoder(w.Body).Decode(&response)
		require.NoError(t, err)

		// Verify document was created with correct owner
		docID, ok := response["id"].(string)
		require.True(t, ok, "Response should contain document ID")
		assert.NotEmpty(t, docID)
		t.Logf("Created document ID: %s", docID)

		// Verify in database
		var doc models.Document
		err = suite.DB.Preload("Owner").Preload("Product").Where("google_file_id = ?", docID).First(&doc).Error
		require.NoError(t, err)

		assert.Equal(t, "Test RFC: Complete Integration", doc.Title)
		assert.Equal(t, product.ID, doc.Product.ID)
		assert.NotNil(t, doc.OwnerID, "OwnerID should be set")
		if doc.OwnerID != nil {
			assert.NotNil(t, doc.Owner, "Owner should be loaded")
			assert.Equal(t, user.ID, *doc.OwnerID)
		}
	})

	t.Run("Search for Document", func(t *testing.T) {
		// Create and index a document for searching
		doc := fixtures.NewDocument().
			WithTitle("Searchable RFC Document").
			WithDocType("RFC").
			WithProduct(product.Name).
			WithOwner(user.EmailAddress).
			WithStatus(models.InReviewDocumentStatus).
			Create(t, suite.DB)

		// Convert to search document and index
		searchDoc := ModelToSearchDocument(doc)
		ctx := context.Background()
		err := suite.SearchProvider.DocumentIndex().Index(ctx, searchDoc)
		require.NoError(t, err)

		// Wait for indexing (Meilisearch may need a moment)
		time.Sleep(100 * time.Millisecond)

		// Search for the document
		results, err := suite.SearchProvider.DocumentIndex().Search(ctx, &search.SearchQuery{
			Query: "Searchable RFC",
			Filters: map[string][]string{
				"status": {"In-Review"},
			},
			PerPage: 10,
		})
		require.NoError(t, err)

		assert.NotEmpty(t, results.Hits)
		assert.Equal(t, "Searchable RFC Document", results.Hits[0].Title)
		assert.Equal(t, doc.GoogleFileID, results.Hits[0].ObjectID)
	})

	t.Run("Get Document via API", func(t *testing.T) {
		// Create a document
		doc := fixtures.NewDocument().
			WithTitle("API Retrievable Document").
			WithDocType("PRD").
			WithProduct(product.Name).
			WithOwner(user.EmailAddress).
			WithStatus(models.ApprovedDocumentStatus).
			Create(t, suite.DB)

		// Add the document file to mock workspace
		mockWorkspace.WithFile(doc.GoogleFileID, "API Retrievable Document", "application/vnd.google-apps.document")

		// Test GET endpoint
		handler := pkgauth.Middleware(mockAuth, log)(
			apiv2.DocumentHandler(srv),
		)

		req := httptest.NewRequest("GET", "/api/v2/documents/"+doc.GoogleFileID, nil)
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Logf("Response body: %s", w.Body.String())
		}

		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		err := json.NewDecoder(w.Body).Decode(&response)
		require.NoError(t, err)

		// API returns "objectID" not "id"
		assert.Equal(t, doc.GoogleFileID, response["objectID"])
		assert.Equal(t, "API Retrievable Document", response["title"])
		assert.Equal(t, "Approved", response["status"])
	})

	t.Run("Authorization: User Cannot Access Others' Drafts", func(t *testing.T) {
		// Create a document owned by another user
		otherUser := fixtures.NewUser().
			WithEmail("other@hashicorp.com").
			Create(t, suite.DB)

		doc := fixtures.NewDocument().
			WithTitle("Private Draft").
			WithDocType("RFC").
			WithProduct(product.Name).
			WithOwner(otherUser.EmailAddress).
			WithStatus(models.WIPDocumentStatus).
			Create(t, suite.DB)

		// Try to access as different user
		handler := pkgauth.Middleware(mockAuth, log)(
			apiv2.DocumentHandler(srv),
		)

		req := httptest.NewRequest("GET", "/api/v2/documents/"+doc.GoogleFileID, nil)
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		// Should be forbidden (depending on authorization logic)
		// This test demonstrates proper auth setup
		// Actual behavior depends on your authorization rules
		assert.Contains(t, []int{http.StatusForbidden, http.StatusNotFound}, w.Code,
			"User should not be able to access other user's draft")
	})
}

// TestCompleteIntegration_ProductsEndpoint tests the products endpoint with search
func TestCompleteIntegration_ProductsEndpoint(t *testing.T) {
	suite := NewIntegrationSuite(t)
	defer suite.Cleanup()

	// Create test products
	product1 := fixtures.NewProduct().
		WithName("Vault").
		WithAbbreviation("VAULT").
		Create(t, suite.DB)

	product2 := fixtures.NewProduct().
		WithName("Consul").
		WithAbbreviation("CONSUL").
		Create(t, suite.DB)

	// Create documents for products to appear in search
	user := fixtures.NewUser().
		WithEmail("tester@hashicorp.com").
		Create(t, suite.DB)

	doc1 := fixtures.NewDocument().
		WithTitle("Vault RFC").
		WithDocType("RFC").
		WithProduct(product1.Name).
		WithOwner(user.EmailAddress).
		WithStatus(models.ApprovedDocumentStatus).
		Create(t, suite.DB)

	doc2 := fixtures.NewDocument().
		WithTitle("Consul PRD").
		WithDocType("PRD").
		WithProduct(product2.Name).
		WithOwner(user.EmailAddress).
		WithStatus(models.ApprovedDocumentStatus).
		Create(t, suite.DB)

	// Index documents
	ctx := context.Background()
	for _, doc := range []*models.Document{doc1, doc2} {
		searchDoc := ModelToSearchDocument(doc)
		err := suite.SearchProvider.DocumentIndex().Index(ctx, searchDoc)
		require.NoError(t, err)
	}

	// Wait for indexing
	time.Sleep(100 * time.Millisecond)

	// Test products endpoint (Note: This endpoint may need refactoring to use SearchProvider)
	t.Run("GET products returns product list", func(t *testing.T) {
		// For now, we test the database directly
		var products []models.Product
		err := suite.DB.Order("name").Find(&products).Error
		require.NoError(t, err)

		// Suite creates "Test Product" by default, plus we created Consul and Vault
		assert.Len(t, products, 3)
		assert.Equal(t, "Consul", products[0].Name)
		assert.Equal(t, "Test Product", products[1].Name)
		assert.Equal(t, "Vault", products[2].Name)

		// TODO: Once ProductsHandler is refactored to use SearchProvider,
		// test it like this:
		// handler := api.ProductsHandler(suite.Config, suite.SearchProvider, log)
		// req := httptest.NewRequest("GET", "/api/v1/products", nil)
		// w := httptest.NewRecorder()
		// handler.ServeHTTP(w, req)
		// assert.Equal(t, http.StatusOK, w.Code)
	})
}

// TestCompleteIntegration_DocumentTypesV1 tests the v1 document types endpoint
// This is a simple endpoint that doesn't require auth or search
func TestCompleteIntegration_DocumentTypesV1(t *testing.T) {
	suite := NewIntegrationSuite(t)
	defer suite.Cleanup()

	log := hclog.NewNullLogger()
	handler := api.DocumentTypesHandler(*suite.Config, log)

	t.Run("GET returns configured document types", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/v1/document-types", nil)
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Equal(t, "application/json", w.Header().Get("Content-Type"))

		var docTypes []map[string]interface{}
		err := json.NewDecoder(w.Body).Decode(&docTypes)
		require.NoError(t, err)

		assert.NotEmpty(t, docTypes)

		// Verify expected document types from config
		names := make([]string, len(docTypes))
		for i, dt := range docTypes {
			names[i] = dt["name"].(string)
		}
		assert.Contains(t, names, "RFC")
		assert.Contains(t, names, "PRD")
	})
}

// TestCompleteIntegration_DocumentTypesV2 tests the v2 document types endpoint
func TestCompleteIntegration_DocumentTypesV2(t *testing.T) {
	suite := NewIntegrationSuite(t)
	defer suite.Cleanup()

	testEmail := "viewer@hashicorp.com"
	fixtures.NewUser().WithEmail(testEmail).Create(t, suite.DB)

	mockAuth := mockauth.NewAdapterWithEmail(testEmail)
	log := hclog.NewNullLogger()

	srv := server.Server{
		Config:            suite.Config,
		DB:                suite.DB,
		SearchProvider:    suite.SearchProvider,
		WorkspaceProvider: suite.WorkspaceProvider,
		Logger:            log,
	}

	handler := pkgauth.Middleware(mockAuth, log)(
		apiv2.DocumentTypesHandler(srv),
	)

	t.Run("GET returns document types with metadata", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/v2/document-types", nil)
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		// V2 API returns an array of document types
		var response []map[string]interface{}
		err := json.NewDecoder(w.Body).Decode(&response)
		require.NoError(t, err)

		// Should have at least RFC and PRD from test config
		assert.GreaterOrEqual(t, len(response), 2, "Should return at least 2 document types")

		// Check that document types have expected fields
		assert.Greater(t, len(response), 0, "Response should not be empty")
		if len(response) > 0 {
			assert.Contains(t, response[0], "name")
			assert.Contains(t, response[0], "longName")
		}
	})
}

// TestCompleteIntegration_AnalyticsEndpoint tests analytics without requiring database
func TestCompleteIntegration_AnalyticsEndpoint(t *testing.T) {
	suite := NewIntegrationSuite(t)
	defer suite.Cleanup()

	log := hclog.NewNullLogger()
	handler := api.AnalyticsHandler(log)

	t.Run("POST valid analytics event", func(t *testing.T) {
		reqBody := map[string]interface{}{
			"document_id":  "test-doc-123",
			"product_name": "Vault",
			"event_type":   "view",
		}
		bodyBytes, err := json.Marshal(reqBody)
		require.NoError(t, err)

		req := httptest.NewRequest("POST", "/api/v1/web/analytics", bytes.NewReader(bodyBytes))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("POST analytics without document_id", func(t *testing.T) {
		reqBody := map[string]interface{}{
			"product_name": "Consul",
			"event_type":   "search",
		}
		bodyBytes, err := json.Marshal(reqBody)
		require.NoError(t, err)

		req := httptest.NewRequest("POST", "/api/v1/web/analytics", bytes.NewReader(bodyBytes))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("POST with invalid JSON", func(t *testing.T) {
		req := httptest.NewRequest("POST", "/api/v1/web/analytics", bytes.NewReader([]byte("invalid json")))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

// TestCompleteIntegration_MultiUserScenario demonstrates multiple users interacting
func TestCompleteIntegration_MultiUserScenario(t *testing.T) {
	suite := NewIntegrationSuite(t)
	defer suite.Cleanup()

	log := hclog.NewNullLogger()

	// Setup mock workspace with templates (needed for draft creation)
	mockWorkspace := suite.WorkspaceProvider.(*mock.Adapter)
	rfcTemplateID := suite.Config.DocumentTypes.DocumentType[0].Template
	mockWorkspace.WithFile(rfcTemplateID, "RFC Template", "application/vnd.google-apps.document").
		WithFileContent(rfcTemplateID, "# RFC Template\n").
		WithDocument(rfcTemplateID, &docs.Document{
			DocumentId: rfcTemplateID,
			Title:      "RFC Template",
			Body: &docs.Body{
				Content: []*docs.StructuralElement{
					{
						Paragraph: &docs.Paragraph{
							Elements: []*docs.ParagraphElement{
								{TextRun: &docs.TextRun{Content: "RFC Template\n"}},
							},
						},
					},
				},
			},
		})

	// Create multiple users
	alice := fixtures.NewUser().WithEmail("alice@hashicorp.com").Create(t, suite.DB)
	bob := fixtures.NewUser().WithEmail("bob@hashicorp.com").Create(t, suite.DB)

	// Create product
	_ = fixtures.NewProduct().
		WithName("Boundary").
		WithAbbreviation("BOUNDARY").
		Create(t, suite.DB)

	srv := server.Server{
		Config:            suite.Config,
		DB:                suite.DB,
		SearchProvider:    suite.SearchProvider,
		WorkspaceProvider: suite.WorkspaceProvider,
		Logger:            log,
	}

	t.Run("Alice creates a document", func(t *testing.T) {
		mockAuth := mockauth.NewAdapterWithEmail(alice.EmailAddress)
		handler := pkgauth.Middleware(mockAuth, log)(
			apiv2.DraftsHandler(srv),
		)

		reqBody := map[string]interface{}{
			"title":   "Alice's RFC",
			"docType": "RFC",
			"product": "Boundary",
			"summary": "A document created by Alice",
		}
		bodyBytes, err := json.Marshal(reqBody)
		require.NoError(t, err)

		req := httptest.NewRequest("POST", "/api/v2/drafts", bytes.NewReader(bodyBytes))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		err = json.NewDecoder(w.Body).Decode(&response)
		require.NoError(t, err)

		// Verify document has Alice as owner
		docID := response["id"].(string)
		var doc models.Document
		err = suite.DB.Preload("Owner").Where("google_file_id = ?", docID).First(&doc).Error
		require.NoError(t, err)

		require.NotNil(t, doc.Owner)
		assert.Equal(t, alice.ID, doc.Owner.ID)
	})

	t.Run("Bob creates a different document", func(t *testing.T) {
		mockAuth := mockauth.NewAdapterWithEmail(bob.EmailAddress)
		handler := pkgauth.Middleware(mockAuth, log)(
			apiv2.DraftsHandler(srv),
		)

		reqBody := map[string]interface{}{
			"title":   "Bob's PRD",
			"docType": "PRD",
			"product": "Boundary",
			"summary": "A document created by Bob",
		}
		bodyBytes, err := json.Marshal(reqBody)
		require.NoError(t, err)

		req := httptest.NewRequest("POST", "/api/v2/drafts", bytes.NewReader(bodyBytes))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		err = json.NewDecoder(w.Body).Decode(&response)
		require.NoError(t, err)

		// Verify document has Bob as owner
		docID := response["id"].(string)
		var doc models.Document
		err = suite.DB.Preload("Owner").Where("google_file_id = ?", docID).First(&doc).Error
		require.NoError(t, err)

		require.NotNil(t, doc.Owner)
		assert.Equal(t, bob.ID, doc.Owner.ID)
	})
}
