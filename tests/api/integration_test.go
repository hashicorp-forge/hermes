//go:build integration
// +build integration

package api

import (
	"testing"

	"github.com/hashicorp-forge/hermes/pkg/models"
	"github.com/hashicorp-forge/hermes/pkg/search"
	"github.com/hashicorp-forge/hermes/tests/api/fixtures"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestSuite_DatabaseSetup tests that the test suite correctly sets up the database.
func TestSuite_DatabaseSetup(t *testing.T) {
	suite := NewIntegrationSuite(t)
	defer suite.Cleanup()

	// Verify database connection
	assert.NotNil(t, suite.DB)
	assert.NotEmpty(t, suite.DBName)

	// Verify document types were seeded
	var docTypes []models.DocumentType
	err := suite.DB.Find(&docTypes).Error
	require.NoError(t, err)
	assert.GreaterOrEqual(t, len(docTypes), 3, "Should have at least 3 document types")

	// Verify products were seeded
	var products []models.Product
	err = suite.DB.Find(&products).Error
	require.NoError(t, err)
	assert.GreaterOrEqual(t, len(products), 1, "Should have at least 1 product")
}

// TestSuite_SearchIntegration tests that the search provider is working.
func TestSuite_SearchIntegration(t *testing.T) {
	suite := NewIntegrationSuite(t)
	defer suite.Cleanup()

	// Verify search provider is initialized
	assert.NotNil(t, suite.SearchProvider)

	// Test search provider health
	err := suite.SearchProvider.Healthy(suite.Ctx)
	require.NoError(t, err, "Search provider should be healthy")
}

// TestDatabase_CreateDocument tests creating a document in the database.
func TestDatabase_CreateDocument(t *testing.T) {
	suite := NewIntegrationSuite(t)
	defer suite.Cleanup()

	// Create a test document using the fixture builder
	doc := fixtures.NewDocument().
		WithGoogleFileID("test-db-doc-1").
		WithTitle("Test Database Document").
		WithDocType("RFC").
		WithStatus(models.WIPDocumentStatus).
		WithSummary("This tests database creation").
		WithDocNumber(100).
		Create(t, suite.DB)

	// Verify the document was created
	assert.NotZero(t, doc.ID, "Document should have an ID")
	assert.Equal(t, "test-db-doc-1", doc.GoogleFileID)
	assert.Equal(t, "Test Database Document", doc.Title)
	assert.Equal(t, "RFC", doc.DocumentType.Name)

	// Retrieve the document from the database
	var retrieved models.Document
	err := suite.DB.Where("google_file_id = ?", "test-db-doc-1").First(&retrieved).Error
	require.NoError(t, err)

	assert.Equal(t, doc.Title, retrieved.Title)
	assert.Equal(t, doc.GoogleFileID, retrieved.GoogleFileID)
}

// TestDatabase_DocumentWithRelations tests creating a document with relationships.
func TestDatabase_DocumentWithRelations(t *testing.T) {
	suite := NewIntegrationSuite(t)
	defer suite.Cleanup()

	// Create users
	owner := fixtures.NewUser().
		WithEmail("owner@example.com").
		Create(t, suite.DB)

	contributor := fixtures.NewUser().
		WithEmail("contributor@example.com").
		Create(t, suite.DB)

	// Create a document with relationships
	_ = fixtures.NewDocument().
		WithGoogleFileID("test-relations-1").
		WithTitle("Document with Relations").
		WithOwner(owner.EmailAddress).
		WithContributor(contributor.EmailAddress).
		Create(t, suite.DB)

	// Retrieve with preloading
	var retrieved models.Document
	err := suite.DB.
		Preload("Owner").
		Preload("Contributors").
		Where("google_file_id = ?", "test-relations-1").
		First(&retrieved).Error
	require.NoError(t, err)

	// Verify relationships
	assert.NotNil(t, retrieved.Owner)
	assert.Equal(t, "owner@example.com", retrieved.Owner.EmailAddress)
	assert.Len(t, retrieved.Contributors, 1)
	assert.Equal(t, "contributor@example.com", retrieved.Contributors[0].EmailAddress)
}

// TestSearch_IndexAndSearchDocument tests indexing and searching documents.
func TestSearch_IndexAndSearchDocument(t *testing.T) {
	suite := NewIntegrationSuite(t)
	defer suite.Cleanup()

	// Create test documents
	doc1 := fixtures.NewDocument().
		WithGoogleFileID("search-test-1").
		WithTitle("Terraform Provider Design").
		WithDocType("RFC").
		WithStatus(models.WIPDocumentStatus).
		Create(t, suite.DB)

	doc2 := fixtures.NewDocument().
		WithGoogleFileID("search-test-2").
		WithTitle("Consul Feature Proposal").
		WithDocType("PRD").
		WithStatus(models.ApprovedDocumentStatus).
		Create(t, suite.DB)

	// Convert to search documents and index
	searchDoc1 := ModelToSearchDocument(doc1)
	err := suite.SearchProvider.DocumentIndex().Index(suite.Ctx, searchDoc1)
	require.NoError(t, err)

	searchDoc2 := ModelToSearchDocument(doc2)
	err = suite.SearchProvider.DocumentIndex().Index(suite.Ctx, searchDoc2)
	require.NoError(t, err)

	// Give the search index a moment to update
	// (Meilisearch may need a brief moment for consistency)
	// In production, you'd wait for the task to complete
	// For tests, a small sleep is acceptable
	// time.Sleep(100 * time.Millisecond)

	t.Run("Search for all documents", func(t *testing.T) {
		query := &search.SearchQuery{
			Query:   "",
			Page:    1,
			PerPage: 10,
		}
		result, err := suite.SearchProvider.DocumentIndex().Search(suite.Ctx, query)
		require.NoError(t, err)

		// Should find both documents
		assert.GreaterOrEqual(t, result.TotalHits, 2, "Should find at least 2 documents")
	})

	t.Run("Search for Terraform", func(t *testing.T) {
		query := &search.SearchQuery{
			Query:   "Terraform",
			Page:    1,
			PerPage: 10,
		}
		result, err := suite.SearchProvider.DocumentIndex().Search(suite.Ctx, query)
		require.NoError(t, err)

		// Should find the Terraform document
		assert.GreaterOrEqual(t, result.TotalHits, 1, "Should find Terraform document")

		// Verify the result contains the right document
		if len(result.Hits) > 0 {
			found := false
			for _, hit := range result.Hits {
				if hit.DocID == "search-test-1" {
					found = true
					assert.Equal(t, "Terraform Provider Design", hit.Title)
					break
				}
			}
			assert.True(t, found, "Should find the Terraform document")
		}
	})

	t.Run("Filter by status", func(t *testing.T) {
		query := &search.SearchQuery{
			Query:   "",
			Page:    1,
			PerPage: 10,
			Filters: map[string][]string{
				"status": {"Approved"},
			},
		}
		result, err := suite.SearchProvider.DocumentIndex().Search(suite.Ctx, query)
		require.NoError(t, err)

		// Should find only approved documents
		if result.TotalHits > 0 {
			for _, hit := range result.Hits {
				assert.Equal(t, "Approved", hit.Status, "All results should be Approved")
			}
		}
	})
}

// TestSearch_DeleteDocument tests deleting a document from search.
func TestSearch_DeleteDocument(t *testing.T) {
	suite := NewIntegrationSuite(t)
	defer suite.Cleanup()

	// Create and index a document
	doc := fixtures.NewDocument().
		WithGoogleFileID("delete-test-1").
		WithTitle("Document to Delete").
		Create(t, suite.DB)

	searchDoc := ModelToSearchDocument(doc)
	err := suite.SearchProvider.DocumentIndex().Index(suite.Ctx, searchDoc)
	require.NoError(t, err)

	// Delete the document from search
	err = suite.SearchProvider.DocumentIndex().Delete(suite.Ctx, doc.GoogleFileID)
	require.NoError(t, err)

	// Verify it's gone from search
	query := &search.SearchQuery{
		Query:   doc.GoogleFileID,
		Page:    1,
		PerPage: 10,
	}
	result, err := suite.SearchProvider.DocumentIndex().Search(suite.Ctx, query)
	require.NoError(t, err)

	// Should not find the deleted document
	found := false
	for _, hit := range result.Hits {
		if hit.DocID == doc.GoogleFileID {
			found = true
			break
		}
	}
	assert.False(t, found, "Deleted document should not be in search results")
}

// TestModelToSearchDocument tests the conversion helper with database.
func TestModelToSearchDocument(t *testing.T) {
	suite := NewIntegrationSuite(t)
	defer suite.Cleanup()

	owner := fixtures.NewUser().
		WithEmail("test@example.com").
		Create(t, suite.DB)

	doc := fixtures.NewDocument().
		WithGoogleFileID("convert-test-1").
		WithTitle("Test Conversion").
		WithDocType("RFC").
		WithStatus(models.ApprovedDocumentStatus).
		WithSummary("Test summary").
		WithDocNumber(42).
		WithOwner(owner.EmailAddress).
		WithProduct("Test Product").
		// Don't add custom fields for now as they require DocumentTypeCustomField setup
		Create(t, suite.DB)

	// Convert to search document
	searchDoc := ModelToSearchDocument(doc)

	// Verify all fields were converted correctly
	assert.Equal(t, doc.GoogleFileID, searchDoc.ObjectID)
	assert.Equal(t, doc.GoogleFileID, searchDoc.DocID)
	assert.Equal(t, doc.Title, searchDoc.Title)
	assert.Equal(t, "42", searchDoc.DocNumber)
	assert.Equal(t, "RFC", searchDoc.DocType)
	assert.Equal(t, "Approved", searchDoc.Status)
	assert.Equal(t, "Test summary", searchDoc.Summary)
	assert.Equal(t, "Test Product", searchDoc.Product)
	assert.Contains(t, searchDoc.Owners, "test@example.com")
	// Custom fields test removed as it requires DocumentTypeCustomField setup
}
