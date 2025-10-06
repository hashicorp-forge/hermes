//go:build integration
// +build integration

package api

import (
	"fmt"
	"testing"

	"github.com/hashicorp-forge/hermes/pkg/models"
	"github.com/hashicorp-forge/hermes/tests/api/fixtures"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestDocuments_Get tests the GET /api/v2/documents/:id endpoint.
// V2 API uses database as source of truth (not Algolia) and can be tested with mocks.
func TestDocuments_Get(t *testing.T) {
	suite := NewIntegrationSuite(t)
	defer suite.Cleanup()

	t.Run("Get existing document", func(t *testing.T) {
		// Create test document in database (V2 uses database as source of truth)
		doc := fixtures.NewDocument().
			WithGoogleFileID("test-file-123").
			WithTitle("Test RFC").
			WithDocType("RFC").
			WithStatus(models.WIPDocumentStatus).
			WithSummary("This is a test document").
			WithDocNumber(123).
			Create(t, suite.DB)

		// Make GET request to V2 endpoint
		resp := suite.Client.Get(fmt.Sprintf("/api/v2/documents/%s", doc.GoogleFileID))

		// Assert response
		resp.AssertStatusOK()

		// Decode and validate response body
		var result map[string]interface{}
		resp.DecodeJSON(&result)

		// V2 returns database fields, not Algolia objectID
		assert.Equal(t, doc.GoogleFileID, result["googleFileID"], "googleFileID should match")
		assert.Equal(t, doc.Title, result["title"], "title should match")

		// DocType is nested in V2
		if docType, ok := result["docType"].(map[string]interface{}); ok {
			assert.Equal(t, "RFC", docType["name"], "docType name should match")
		}

		assert.Equal(t, "WIP", result["status"], "status should match")

		// Check that locked field is present (comes from database)
		_, hasLocked := result["locked"]
		assert.True(t, hasLocked, "Response should include locked field from database")
	})

	t.Run("Get non-existent document", func(t *testing.T) {
		// Make GET request for document that doesn't exist
		resp := suite.Client.Get("/api/v2/documents/non-existent-id")

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

		// Make GET request to V2 endpoint
		resp := suite.Client.Get(fmt.Sprintf("/api/v2/documents/%s", doc.GoogleFileID))
		resp.AssertStatusOK()

		// Decode response
		var result map[string]interface{}
		resp.DecodeJSON(&result)

		assert.Equal(t, doc.GoogleFileID, result["googleFileID"])
		assert.Equal(t, "RFC with Resources", result["title"])
	})

	t.Run("Get document with custom fields", func(t *testing.T) {
		// Create document with custom fields
		doc := fixtures.NewDocument().
			WithGoogleFileID("test-file-789").
			WithTitle("RFC with Custom Fields").
			WithCustomField("stakeholders", "team-a, team-b").
			Create(t, suite.DB)

		// Make GET request to V2 endpoint
		resp := suite.Client.Get(fmt.Sprintf("/api/v2/documents/%s", doc.GoogleFileID))
		resp.AssertStatusOK()

		// Decode response
		var result map[string]interface{}
		resp.DecodeJSON(&result)

		assert.Equal(t, doc.GoogleFileID, result["googleFileID"])

		// Verify custom fields are present
		if customFields, ok := result["customFields"].([]interface{}); ok {
			assert.GreaterOrEqual(t, len(customFields), 1, "Should have at least one custom field")
		}
	})
}

// TestDocuments_Patch tests the PATCH /api/v2/documents/:id endpoint.
func TestDocuments_Patch(t *testing.T) {
	suite := NewSuite(t)
	defer suite.Cleanup()

	t.Run("Update document title", func(t *testing.T) {
		// Create test document
		doc := fixtures.NewDocument().
			WithGoogleFileID("test-patch-1").
			WithTitle("Original Title").
			Create(t, suite.DB)

		// Prepare patch request
		patch := map[string]interface{}{
			"title": "Updated Title",
		}

		// Make PATCH request
		resp := suite.Client.Patch(fmt.Sprintf("/api/v2/documents/%s", doc.GoogleFileID), patch)
		resp.AssertStatusOK()

		// Verify document was updated in database
		var updated models.Document
		err := suite.DB.Where("google_file_id = ?", doc.GoogleFileID).First(&updated).Error
		require.NoError(t, err)
		assert.Equal(t, "Updated Title", updated.Title)
	})

	t.Run("Update document status", func(t *testing.T) {
		// Create test document
		doc := fixtures.NewDocument().
			WithGoogleFileID("test-patch-2").
			WithStatus(models.WIPDocumentStatus).
			Create(t, suite.DB)

		// Prepare patch request
		patch := map[string]interface{}{
			"status": "In-Review",
		}

		// Make PATCH request
		resp := suite.Client.Patch(fmt.Sprintf("/api/v2/documents/%s", doc.GoogleFileID), patch)
		resp.AssertStatusOK()

		// Verify status was updated
		var updated models.Document
		err := suite.DB.Where("google_file_id = ?", doc.GoogleFileID).First(&updated).Error
		require.NoError(t, err)
		assert.Equal(t, models.InReviewDocumentStatus, updated.Status)
	})

	t.Run("Update document with invalid data", func(t *testing.T) {
		// Create test document
		doc := fixtures.NewDocument().
			WithGoogleFileID("test-patch-3").
			Create(t, suite.DB)

		// Prepare invalid patch (empty title)
		patch := map[string]interface{}{
			"title": "",
		}

		// Make PATCH request
		resp := suite.Client.Patch(fmt.Sprintf("/api/v2/documents/%s", doc.GoogleFileID), patch)

		// Should return error (likely 400 Bad Request)
		assert.True(t, resp.StatusCode >= 400, "Should return error status for invalid data")
	})
}

// TestDocuments_Delete tests the DELETE /api/v2/documents/:id endpoint.
func TestDocuments_Delete(t *testing.T) {
	suite := NewSuite(t)
	defer suite.Cleanup()

	t.Run("Delete existing document", func(t *testing.T) {
		// Create test document
		doc := fixtures.NewDocument().
			WithGoogleFileID("test-delete-1").
			WithTitle("Document to Delete").
			Create(t, suite.DB)

		// Make DELETE request
		resp := suite.Client.Delete(fmt.Sprintf("/api/v2/documents/%s", doc.GoogleFileID))
		resp.AssertStatusOK()

		// Verify document was deleted from database
		var deleted models.Document
		err := suite.DB.Where("google_file_id = ?", doc.GoogleFileID).First(&deleted).Error
		assert.Error(t, err, "Document should be deleted")
	})

	t.Run("Delete non-existent document", func(t *testing.T) {
		// Make DELETE request for document that doesn't exist
		resp := suite.Client.Delete("/api/v2/documents/non-existent-delete")

		// Should return 404
		resp.AssertStatusNotFound()
	})
}

// TestDocuments_List tests the GET /api/v2/documents endpoint (list).
func TestDocuments_List(t *testing.T) {
	suite := NewSuite(t)
	defer suite.Cleanup()

	t.Run("List all documents", func(t *testing.T) {
		// Create multiple test documents
		_ = fixtures.NewDocument().
			WithGoogleFileID("list-test-1").
			WithTitle("First Document").
			Create(t, suite.DB)

		_ = fixtures.NewDocument().
			WithGoogleFileID("list-test-2").
			WithTitle("Second Document").
			Create(t, suite.DB)

		// Make GET request
		resp := suite.Client.Get("/api/v2/documents")
		resp.AssertStatusOK()

		// Decode response (V2 returns array directly)
		var result []map[string]interface{}
		resp.DecodeJSON(&result)

		// Should return at least 2 documents
		assert.GreaterOrEqual(t, len(result), 2, "Should return at least 2 documents")

		// Verify we can find our test documents
		foundDoc1 := false
		foundDoc2 := false
		for _, doc := range result {
			if googleFileID, ok := doc["googleFileID"].(string); ok {
				if googleFileID == "list-test-1" {
					foundDoc1 = true
				}
				if googleFileID == "list-test-2" {
					foundDoc2 = true
				}
			}
		}
		assert.True(t, foundDoc1, "Should find doc1")
		assert.True(t, foundDoc2, "Should find doc2")
	})

	t.Run("List documents", func(t *testing.T) {
		// Create documents with specific titles
		_ = fixtures.NewDocument().
			WithGoogleFileID("list-test-3").
			WithTitle("Terraform Provider Design").
			Create(t, suite.DB)

		_ = fixtures.NewDocument().
			WithGoogleFileID("list-test-4").
			WithTitle("Consul Feature Proposal").
			Create(t, suite.DB)

		// List documents
		resp := suite.Client.Get("/api/v2/documents")
		resp.AssertStatusOK()

		// Decode response
		var result []map[string]interface{}
		resp.DecodeJSON(&result)

		// Should find both documents
		assert.GreaterOrEqual(t, len(result), 2, "Should find at least 2 documents")

		// Verify we can find our test documents by googleFileID
		foundDoc1 := false
		foundDoc2 := false
		for _, doc := range result {
			if googleFileID, ok := doc["googleFileID"].(string); ok {
				if googleFileID == "list-test-3" {
					foundDoc1 = true
					assert.Equal(t, "Terraform Provider Design", doc["title"])
				}
				if googleFileID == "list-test-4" {
					foundDoc2 = true
					assert.Equal(t, "Consul Feature Proposal", doc["title"])
				}
			}
		}
		assert.True(t, foundDoc1, "Should find doc1")
		assert.True(t, foundDoc2, "Should find doc2")
	})
}
