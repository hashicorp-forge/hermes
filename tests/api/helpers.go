package api

import (
	"fmt"
	"testing"

	"github.com/hashicorp-forge/hermes/tests/api/fixtures"
	"github.com/stretchr/testify/assert"
	"gorm.io/gorm"
)

// WithTransaction runs a test function within a database transaction.
// The transaction is automatically rolled back after the test completes,
// ensuring test isolation without the overhead of creating/dropping databases.
//
// Example usage:
//
//	func TestMyFeature(t *testing.T) {
//	    suite := NewSuite(t)
//	    defer suite.Cleanup()
//
//	    t.Run("CreateDocument", func(t *testing.T) {
//	        WithTransaction(t, suite.DB, func(t *testing.T, tx *gorm.DB) {
//	            doc := fixtures.NewDocument().Create(t, tx)
//	            assert.NotZero(t, doc.ID)
//	        })
//	    })
//	}
//
// This approach provides:
// - Test isolation (each test has clean state)
// - Fast execution (~10-50ms vs 60s)
// - No manual cleanup needed
// - Panic safety (rollback on panic)
func WithTransaction(t *testing.T, db *gorm.DB, fn func(*testing.T, *gorm.DB)) {
	t.Helper()

	tx := db.Begin()
	if tx.Error != nil {
		t.Fatalf("Failed to begin transaction: %v", tx.Error)
	}

	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
			t.Fatalf("Test panicked: %v", r)
		}
		// Always rollback, even on success
		// This ensures test isolation
		if err := tx.Rollback().Error; err != nil {
			t.Logf("Warning: Failed to rollback transaction: %v", err)
		}
	}()

	fn(t, tx)
}

// WithSubTest is a helper that combines subtests with transactions.
// This is the recommended way to write fast, isolated tests.
//
// Example usage:
//
//	func TestDocumentCRUD(t *testing.T) {
//	    suite := NewSuite(t)
//	    defer suite.Cleanup()
//
//	    WithSubTest(t, suite.DB, "Create", func(t *testing.T, tx *gorm.DB) {
//	        doc := fixtures.NewDocument().Create(t, tx)
//	        assert.NotZero(t, doc.ID)
//	    })
//
//	    WithSubTest(t, suite.DB, "Update", func(t *testing.T, tx *gorm.DB) {
//	        // ...
//	    })
//	}
func WithSubTest(t *testing.T, db *gorm.DB, name string, fn func(*testing.T, *gorm.DB)) {
	t.Helper()
	t.Run(name, func(t *testing.T) {
		WithTransaction(t, db, fn)
	})
}

// ParallelWithTransaction runs a test function in parallel within a transaction.
// Use this for tests that can safely run concurrently.
//
// Example usage:
//
//	func TestParallelOperations(t *testing.T) {
//	    suite := NewSuite(t)
//	    defer suite.Cleanup()
//
//	    for i := 0; i < 10; i++ {
//	        i := i
//	        name := fmt.Sprintf("test_%d", i)
//	        ParallelWithTransaction(t, suite.DB, name, func(t *testing.T, tx *gorm.DB) {
//	            doc := fixtures.NewDocument().
//	                WithGoogleFileID(fmt.Sprintf("doc-%d", i)).
//	                Create(t, tx)
//	            assert.NotZero(t, doc.ID)
//	        })
//	    }
//	}
func ParallelWithTransaction(t *testing.T, db *gorm.DB, name string, fn func(*testing.T, *gorm.DB)) {
	t.Helper()
	t.Run(name, func(t *testing.T) {
		t.Parallel()
		WithTransaction(t, db, fn)
	})
}

// TestHelpers_WithTransaction demonstrates the transaction helper.
func TestHelpers_WithTransaction(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping in short mode")
	}

	suite := NewSuite(t)
	defer suite.Cleanup()

	// Example 1: Simple transaction test
	WithTransaction(t, suite.DB, func(t *testing.T, tx *gorm.DB) {
		doc := fixtures.NewDocument().
			WithGoogleFileID("tx-helper-1").
			Create(t, tx)
		assert.NotZero(t, doc.ID)
	})

	// Example 2: Multiple subtests with transactions
	WithSubTest(t, suite.DB, "FirstTest", func(t *testing.T, tx *gorm.DB) {
		doc := fixtures.NewDocument().
			WithGoogleFileID("tx-helper-2").
			Create(t, tx)
		assert.Equal(t, "tx-helper-2", doc.GoogleFileID)
	})

	WithSubTest(t, suite.DB, "SecondTest", func(t *testing.T, tx *gorm.DB) {
		// This test won't see data from FirstTest (transaction isolation)
		doc := fixtures.NewDocument().
			WithGoogleFileID("tx-helper-3").
			Create(t, tx)
		assert.Equal(t, "tx-helper-3", doc.GoogleFileID)
	})
}

// TestHelpers_ParallelWithTransaction demonstrates parallel transaction tests.
func TestHelpers_ParallelWithTransaction(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping in short mode")
	}

	suite := NewSuite(t)
	defer suite.Cleanup()

	// Run 5 tests in parallel
	for i := 0; i < 5; i++ {
		i := i // capture loop variable
		name := fmt.Sprintf("parallel_%d", i)
		ParallelWithTransaction(t, suite.DB, name, func(t *testing.T, tx *gorm.DB) {
			doc := fixtures.NewDocument().
				WithGoogleFileID(fmt.Sprintf("parallel-doc-%d", i)).
				Create(t, tx)
			assert.NotZero(t, doc.ID)
		})
	}
}
