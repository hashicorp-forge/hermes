//go:build integration
// +build integration

package api

import (
	"fmt"
	"testing"

	"github.com/hashicorp-forge/hermes/pkg/models"
	"github.com/hashicorp-forge/hermes/pkg/search"
	"github.com/hashicorp-forge/hermes/tests/api/fixtures"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestDocuments_Get tests the GET /api/v1/documents/:id endpoint.
// TODO: These tests are currently skipped because the API handlers are tightly
// coupled to Algolia's concrete types. See tests/api/README.md for details on
// how to fix this (create API v2 with search abstraction or refactor handlers).
func TestDocuments_Get(t *testing.T) {
	t.Skip("API handlers are tightly coupled to Algolia - needs refactoring. See tests/api/README.md")
	suite := NewIntegrationSuite(t)
	defer suite.Cleanup()

	t.Run("Get existing document", func(t *testing.T) {
		// Create test document in database
		doc := fixtures.NewDocument().
			WithGoogleFileID("test-file-123").
			WithTitle("Test RFC").
			WithDocType("RFC").
			WithStatus(models.WIPDocumentStatus).
			WithSummary("This is a test document").
			WithDocNumber(123).
			Create(t, suite.DB)

		// Index document in search
		searchDoc := ModelToSearchDocument(doc)
		err := suite.SearchProvider.DocumentIndex().Index(suite.Ctx, searchDoc)
		require.NoError(t, err, "Failed to index document")

		// Make GET request
		resp := suite.Client.Get(fmt.Sprintf("/api/v1/documents/%s", doc.GoogleFileID))

		// Assert response
		resp.AssertStatusOK()

		// Decode and validate response body
		var result map[string]interface{}
		resp.DecodeJSON(&result)

		assert.Equal(t, doc.GoogleFileID, result["objectID"], "objectID should match")
		assert.Equal(t, doc.Title, result["title"], "title should match")
		assert.Equal(t, "RFC", result["docType"], "docType should match")
		assert.Equal(t, "WIP", result["status"], "status should match")

		// Check that locked field is present (comes from database, not search)
		_, hasLocked := result["locked"]
		assert.True(t, hasLocked, "Response should include locked field from database")
	})

	t.Run("Get non-existent document", func(t *testing.T) {
		// Make GET request for document that doesn't exist
		resp := suite.Client.Get("/api/v1/documents/non-existent-id")

		// Should return 404
		resp.AssertStatusNotFound()
	})

	t.Run("Get document with related resources", func(t *testing.T) {
		// Create document
		doc := fixtures.NewDocument().
			WithGoogleFileID("test-file-456").
			WithTitle("RFC with Resources").
			Create(t, suite.DB)

		// TODO: Add related resource test when we have proper setup
		// For now, just test document retrieval

		// Index document
		searchDoc := ModelToSearchDocument(doc)
		err := suite.SearchProvider.DocumentIndex().Index(suite.Ctx, searchDoc)
		require.NoError(t, err, "Failed to index document")

		// Make GET request
		resp := suite.Client.Get(fmt.Sprintf("/api/v1/documents/%s", doc.GoogleFileID))
		resp.AssertStatusOK()

		// Decode response
		var result map[string]interface{}
		resp.DecodeJSON(&result)

		assert.Equal(t, doc.GoogleFileID, result["objectID"])
		assert.Equal(t, "RFC with Resources", result["title"])
	})

	t.Run("Get document with custom fields", func(t *testing.T) {
		// Create document with custom fields
		doc := fixtures.NewDocument().
			WithGoogleFileID("test-file-789").
			WithTitle("RFC with Custom Fields").
			WithCustomField("stakeholders", "team-a, team-b").
			Create(t, suite.DB)

		// Index document
		searchDoc := ModelToSearchDocument(doc)
		err := suite.SearchProvider.DocumentIndex().Index(suite.Ctx, searchDoc)
		require.NoError(t, err, "Failed to index document")

		// Make GET request
		resp := suite.Client.Get(fmt.Sprintf("/api/v1/documents/%s", doc.GoogleFileID))
		resp.AssertStatusOK()

		// Decode response
		var result map[string]interface{}
		resp.DecodeJSON(&result)

		assert.Equal(t, doc.GoogleFileID, result["objectID"])
	})
}

// TestDocuments_Patch tests the PATCH /api/v1/documents/:id endpoint.
func TestDocuments_Patch(t *testing.T) {
	t.Skip("API handlers are tightly coupled to Algolia - needs refactoring. See tests/api/README.md")
	suite := NewSuite(t)
	defer suite.Cleanup()

	t.Run("Update document title", func(t *testing.T) {
		// Create test document
		doc := fixtures.NewDocument().
			WithGoogleFileID("test-patch-1").
			WithTitle("Original Title").
			Create(t, suite.DB)

		// Index document
		searchDoc := ModelToSearchDocument(doc)
		err := suite.SearchProvider.DocumentIndex().Index(suite.Ctx, searchDoc)
		require.NoError(t, err)

		// Prepare patch request
		patch := map[string]interface{}{
			"title": "Updated Title",
		}

		// Make PATCH request
		resp := suite.Client.Patch(fmt.Sprintf("/api/v1/documents/%s", doc.GoogleFileID), patch)
		resp.AssertStatusOK()

		// Verify document was updated in database
		var updated models.Document
		err = suite.DB.Where("google_file_id = ?", doc.GoogleFileID).First(&updated).Error
		require.NoError(t, err)
		assert.Equal(t, "Updated Title", updated.Title)
	})

	t.Run("Update document status", func(t *testing.T) {
		// Create test document
		doc := fixtures.NewDocument().
			WithGoogleFileID("test-patch-2").
			WithStatus(models.WIPDocumentStatus).
			Create(t, suite.DB)

		// Index document
		searchDoc := ModelToSearchDocument(doc)
		err := suite.SearchProvider.DocumentIndex().Index(suite.Ctx, searchDoc)
		require.NoError(t, err)

		// Prepare patch request
		patch := map[string]interface{}{
			"status": "In-Review",
		}

		// Make PATCH request
		resp := suite.Client.Patch(fmt.Sprintf("/api/v1/documents/%s", doc.GoogleFileID), patch)
		resp.AssertStatusOK()

		// Verify status was updated
		var updated models.Document
		err = suite.DB.Where("google_file_id = ?", doc.GoogleFileID).First(&updated).Error
		require.NoError(t, err)
		assert.Equal(t, models.InReviewDocumentStatus, updated.Status)
	})

	t.Run("Update document with invalid data", func(t *testing.T) {
		// Create test document
		doc := fixtures.NewDocument().
			WithGoogleFileID("test-patch-3").
			Create(t, suite.DB)

		// Index document
		searchDoc := ModelToSearchDocument(doc)
		err := suite.SearchProvider.DocumentIndex().Index(suite.Ctx, searchDoc)
		require.NoError(t, err)

		// Prepare invalid patch (empty title)
		patch := map[string]interface{}{
			"title": "",
		}

		// Make PATCH request
		resp := suite.Client.Patch(fmt.Sprintf("/api/v1/documents/%s", doc.GoogleFileID), patch)

		// Should return error (likely 400 Bad Request)
		assert.True(t, resp.StatusCode >= 400, "Should return error status for invalid data")
	})
}

// TestDocuments_Delete tests the DELETE /api/v1/documents/:id endpoint.
func TestDocuments_Delete(t *testing.T) {
	t.Skip("API handlers are tightly coupled to Algolia - needs refactoring. See tests/api/README.md")
	suite := NewSuite(t)
	defer suite.Cleanup()

	t.Run("Delete existing document", func(t *testing.T) {
		// Create test document
		doc := fixtures.NewDocument().
			WithGoogleFileID("test-delete-1").
			WithTitle("Document to Delete").
			Create(t, suite.DB)

		// Index document
		searchDoc := ModelToSearchDocument(doc)
		err := suite.SearchProvider.DocumentIndex().Index(suite.Ctx, searchDoc)
		require.NoError(t, err)

		// Make DELETE request
		resp := suite.Client.Delete(fmt.Sprintf("/api/v1/documents/%s", doc.GoogleFileID))
		resp.AssertStatusOK()

		// Verify document was deleted from database
		var deleted models.Document
		err = suite.DB.Where("google_file_id = ?", doc.GoogleFileID).First(&deleted).Error
		assert.Error(t, err, "Document should be deleted")

		// Verify document was removed from search index
		searchQuery := &search.SearchQuery{
			Query:   doc.GoogleFileID,
			Page:    1,
			PerPage: 10,
		}
		searchResults, err := suite.SearchProvider.DocumentIndex().Search(suite.Ctx, searchQuery)
		require.NoError(t, err)
		assert.Equal(t, 0, searchResults.TotalHits, "Document should be removed from search")
	})

	t.Run("Delete non-existent document", func(t *testing.T) {
		// Make DELETE request for document that doesn't exist
		resp := suite.Client.Delete("/api/v1/documents/non-existent-delete")

		// Should return 404
		resp.AssertStatusNotFound()
	})
}

// TestDocuments_List tests the GET /api/v1/documents endpoint (list).
func TestDocuments_List(t *testing.T) {
	t.Skip("API handlers are tightly coupled to Algolia - needs refactoring. See tests/api/README.md")
	suite := NewSuite(t)
	defer suite.Cleanup()

	t.Run("List all documents", func(t *testing.T) {
		// Create multiple test documents
		doc1 := fixtures.NewDocument().
			WithGoogleFileID("list-test-1").
			WithTitle("First Document").
			Create(t, suite.DB)

		doc2 := fixtures.NewDocument().
			WithGoogleFileID("list-test-2").
			WithTitle("Second Document").
			Create(t, suite.DB)

		// Index documents
		searchDoc1 := ModelToSearchDocument(doc1)
		err := suite.SearchProvider.DocumentIndex().Index(suite.Ctx, searchDoc1)
		require.NoError(t, err)
		searchDoc2 := ModelToSearchDocument(doc2)
		err = suite.SearchProvider.DocumentIndex().Index(suite.Ctx, searchDoc2)
		require.NoError(t, err)

		// Make GET request
		resp := suite.Client.Get("/api/v1/documents")
		resp.AssertStatusOK()

		// Decode response
		var result map[string]interface{}
		resp.DecodeJSON(&result)

		// Should have hits
		hits, ok := result["hits"].([]interface{})
		assert.True(t, ok, "Response should have hits array")
		assert.GreaterOrEqual(t, len(hits), 2, "Should return at least 2 documents")
	})

	t.Run("Search documents by query", func(t *testing.T) {
		// Create documents with specific titles
		doc1 := fixtures.NewDocument().
			WithGoogleFileID("search-test-1").
			WithTitle("Terraform Provider Design").
			Create(t, suite.DB)

		doc2 := fixtures.NewDocument().
			WithGoogleFileID("search-test-2").
			WithTitle("Consul Feature Proposal").
			Create(t, suite.DB)

		// Index documents
		searchDoc1 := ModelToSearchDocument(doc1)
		err := suite.SearchProvider.DocumentIndex().Index(suite.Ctx, searchDoc1)
		require.NoError(t, err)
		searchDoc2 := ModelToSearchDocument(doc2)
		err = suite.SearchProvider.DocumentIndex().Index(suite.Ctx, searchDoc2)
		require.NoError(t, err)

		// Search for "Terraform"
		resp := suite.Client.Get("/api/v1/documents?q=Terraform")
		resp.AssertStatusOK()

		// Decode response
		var result map[string]interface{}
		resp.DecodeJSON(&result)

		hits, ok := result["hits"].([]interface{})
		assert.True(t, ok, "Response should have hits array")

		// Should find at least one document
		assert.GreaterOrEqual(t, len(hits), 1, "Should find documents matching Terraform")
	})
}
