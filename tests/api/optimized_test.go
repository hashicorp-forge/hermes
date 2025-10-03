//go:build integration
// +build integration

package api

import (
	"fmt"
	"testing"
	"time"

	"github.com/hashicorp-forge/hermes/pkg/models"
	"github.com/hashicorp-forge/hermes/pkg/search"
	"github.com/hashicorp-forge/hermes/tests/api/fixtures"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

// BenchmarkSuite_DatabaseSetup benchmarks database setup performance.
func BenchmarkSuite_DatabaseSetup(b *testing.B) {
	for i := 0; i < b.N; i++ {
		suite := NewIntegrationSuite(&testing.T{})
		suite.Cleanup()
	}
}

// TestFast_DatabaseOperations tests database operations with a shared suite.
// This approach is much faster as it reuses the same database.
func TestFast_DatabaseOperations(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping in short mode")
	}

	suite := NewIntegrationSuite(t)
	defer suite.Cleanup()

	t.Run("CreateDocument", func(t *testing.T) {
		// Use a transaction for isolation
		tx := suite.DB.Begin()
		defer tx.Rollback()

		doc := fixtures.NewDocument().
			WithGoogleFileID("fast-test-1").
			WithTitle("Fast Test Document").
			WithDocType("RFC").
			Create(t, tx)

		assert.NotZero(t, doc.ID)
		assert.Equal(t, "fast-test-1", doc.GoogleFileID)
	})

	t.Run("CreateDocumentWithRelations", func(t *testing.T) {
		tx := suite.DB.Begin()
		defer tx.Rollback()

		owner := fixtures.NewUser().
			WithEmail("fast-owner@example.com").
			Create(t, tx)

		_ = fixtures.NewDocument().
			WithGoogleFileID("fast-test-2").
			WithTitle("Document with Owner").
			WithOwner(owner.EmailAddress).
			Create(t, tx)

		// Retrieve with preloading
		var retrieved models.Document
		err := tx.Preload("Owner").
			Where("google_file_id = ?", "fast-test-2").
			First(&retrieved).Error
		require.NoError(t, err)

		assert.NotNil(t, retrieved.Owner)
		assert.Equal(t, "fast-owner@example.com", retrieved.Owner.EmailAddress)
	})

	t.Run("SearchOperations", func(t *testing.T) {
		tx := suite.DB.Begin()
		defer tx.Rollback()

		// Create a document
		doc := fixtures.NewDocument().
			WithGoogleFileID("fast-search-1").
			WithTitle("Fast Search Test").
			Create(t, tx)

		// Index in search
		searchDoc := ModelToSearchDocument(doc)
		err := suite.SearchProvider.DocumentIndex().Index(suite.Ctx, searchDoc)
		require.NoError(t, err)

		// Clean up search
		defer suite.SearchProvider.DocumentIndex().Delete(suite.Ctx, doc.GoogleFileID)

		// Search
		query := &search.SearchQuery{
			Query:   "Fast",
			Page:    1,
			PerPage: 10,
		}
		result, err := suite.SearchProvider.DocumentIndex().Search(suite.Ctx, query)
		require.NoError(t, err)

		assert.GreaterOrEqual(t, result.TotalHits, 1)
	})
}

// TestParallel_DatabaseOperations demonstrates parallel test execution.
// Each subtest uses a transaction for isolation.
func TestParallel_DatabaseOperations(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping in short mode")
	}

	suite := NewSuite(t)
	defer suite.Cleanup()

	t.Run("group", func(t *testing.T) {
		for i := 0; i < 3; i++ {
			i := i // capture loop variable
			t.Run(fmt.Sprintf("parallel_%d", i), func(t *testing.T) {
				t.Parallel() // This test can run in parallel

				tx := suite.DB.Begin()
				defer tx.Rollback()

				doc := fixtures.NewDocument().
					WithGoogleFileID(fmt.Sprintf("parallel-test-%d", i)).
					WithTitle(fmt.Sprintf("Parallel Test %d", i)).
					Create(t, tx)

				assert.NotZero(t, doc.ID)
				assert.Contains(t, doc.GoogleFileID, fmt.Sprintf("parallel-test-%d", i))
			})
		}
	})
}

// TestOptimized_SearchBatch tests batch indexing for better performance.
func TestOptimized_SearchBatch(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping in short mode")
	}

	suite := NewSuite(t)
	defer suite.Cleanup()

	tx := suite.DB.Begin()
	defer tx.Rollback()

	// Create multiple documents
	docs := make([]*models.Document, 5)
	searchDocs := make([]*search.Document, 5)

	for i := 0; i < 5; i++ {
		doc := fixtures.NewDocument().
			WithGoogleFileID(fmt.Sprintf("batch-test-%d", i)).
			WithTitle(fmt.Sprintf("Batch Test Document %d", i)).
			Create(t, tx)
		docs[i] = doc
		searchDocs[i] = ModelToSearchDocument(doc)
	}

	// Batch index - much faster than individual Index() calls
	err := suite.SearchProvider.DocumentIndex().IndexBatch(suite.Ctx, searchDocs)
	require.NoError(t, err)

	// Clean up
	defer func() {
		docIDs := make([]string, len(docs))
		for i, doc := range docs {
			docIDs[i] = doc.GoogleFileID
		}
		suite.SearchProvider.DocumentIndex().DeleteBatch(suite.Ctx, docIDs)
	}()

	// Verify all were indexed
	query := &search.SearchQuery{
		Query:   "Batch",
		Page:    1,
		PerPage: 10,
	}
	result, err := suite.SearchProvider.DocumentIndex().Search(suite.Ctx, query)
	require.NoError(t, err)

	assert.GreaterOrEqual(t, result.TotalHits, 5, "Should find all batch-indexed documents")
}

// TestWithMockSearch demonstrates using mock search for faster tests.
func TestWithMockSearch(t *testing.T) {
	suite := NewSuite(t, WithMockSearch())
	defer suite.Cleanup()

	// Mock search is instant - no network calls
	doc := fixtures.NewDocument().
		WithGoogleFileID("mock-test-1").
		WithTitle("Mock Search Test").
		Create(t, suite.DB)

	searchDoc := ModelToSearchDocument(doc)
	err := suite.SearchProvider.DocumentIndex().Index(suite.Ctx, searchDoc)
	require.NoError(t, err)

	// Search operations complete instantly with mock
	query := &search.SearchQuery{
		Query:   "Mock",
		Page:    1,
		PerPage: 10,
	}
	result, err := suite.SearchProvider.DocumentIndex().Search(suite.Ctx, query)
	require.NoError(t, err)

	// Mock returns empty results but doesn't error
	assert.NotNil(t, result)
}

// Helper to demonstrate transaction-based test isolation
func runInTransaction(t *testing.T, db *gorm.DB, fn func(*testing.T, *gorm.DB)) {
	tx := db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
			panic(r)
		}
		tx.Rollback() // Always rollback, even on success
	}()

	fn(t, tx)
}

// TestHelper_TransactionIsolation demonstrates the transaction helper.
func TestHelper_TransactionIsolation(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping in short mode")
	}

	suite := NewSuite(t)
	defer suite.Cleanup()

	// First transaction
	runInTransaction(t, suite.DB, func(t *testing.T, tx *gorm.DB) {
		doc := fixtures.NewDocument().
			WithGoogleFileID("isolation-test-1").
			Create(t, tx)

		var found models.Document
		err := tx.Where("google_file_id = ?", "isolation-test-1").First(&found).Error
		require.NoError(t, err)
		assert.Equal(t, doc.ID, found.ID)
	})

	// Second transaction - document from first shouldn't exist (was rolled back)
	runInTransaction(t, suite.DB, func(t *testing.T, tx *gorm.DB) {
		var found models.Document
		err := tx.Where("google_file_id = ?", "isolation-test-1").First(&found).Error
		assert.Error(t, err, "Document should not exist after rollback")
	})
}

// TestPerformanceComparison compares different approaches.
func TestPerformanceComparison(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping in short mode")
	}

	t.Run("WithNewSuiteEachTest", func(t *testing.T) {
		// This is slow - creates new database
		start := time.Now()
		suite := NewSuite(t)
		defer suite.Cleanup()

		doc := fixtures.NewDocument().
			WithGoogleFileID("perf-new-suite").
			Create(t, suite.DB)
		assert.NotZero(t, doc.ID)

		t.Logf("Time with new suite: %v", time.Since(start))
	})

	t.Run("WithSharedSuiteAndTransaction", func(t *testing.T) {
		// This is fast - reuses database
		suite := NewSuite(t)
		defer suite.Cleanup()

		start := time.Now()
		tx := suite.DB.Begin()
		defer tx.Rollback()

		doc := fixtures.NewDocument().
			WithGoogleFileID("perf-transaction").
			Create(t, tx)
		assert.NotZero(t, doc.ID)

		t.Logf("Time with transaction: %v", time.Since(start))
	})
}
