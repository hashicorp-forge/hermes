//go:build integration
// +build integration

package api

import (
	"testing"
)

// V1TestSuite provides test infrastructure for V1 API endpoints.
// It wraps MainTestSuite and adds V1-specific helpers.
type V1TestSuite struct {
	*MainTestSuite
}

// NewV1TestSuite creates a new V1 API test suite.
func NewV1TestSuite(t *testing.T) *V1TestSuite {
	return &V1TestSuite{
		MainTestSuite: NewMainTestSuite(t),
	}
}

// TestV1Suite is the main test runner for all V1 API tests.
// It can be run individually or as part of the full API test suite.
func TestV1Suite(t *testing.T) {
	// Run all V1 tests as subtests
	t.Run("DocumentTypes", testV1DocumentTypes)
	t.Run("Products", testV1Products)
	t.Run("Analytics", testV1Analytics)
	t.Run("Documents", testV1Documents) // These are currently skipped but framework is here
	t.Run("Drafts", testV1Drafts)       // These are currently skipped but framework is here
	t.Run("Reviews", testV1Reviews)     // These are currently skipped but framework is here
	t.Run("Approvals", testV1Approvals) // These are currently skipped but framework is here
}

// testV1DocumentTypes tests the /api/v1/document-types endpoint.
func testV1DocumentTypes(t *testing.T) {
	suite := NewV1TestSuite(t)
	defer suite.Cleanup()

	// For now, skip these tests as they need handler implementation
	// They will be migrated from api_v1_test.go once the infrastructure is proven
	t.Skip("Test implementation pending - see api_v1_test.go for current working tests")
}

// testV1Products tests the /api/v1/products endpoint.
func testV1Products(t *testing.T) {
	suite := NewV1TestSuite(t)
	defer suite.Cleanup()

	// For now, skip these tests as they need handler implementation
	t.Skip("Test implementation pending - will be migrated from existing tests")
}

// testV1Analytics tests the /api/v1/analytics endpoint.
func testV1Analytics(t *testing.T) {
	suite := NewV1TestSuite(t)
	defer suite.Cleanup()

	// For now, skip these tests as they need handler implementation
	t.Skip("Test implementation pending - will be migrated from existing tests")
}

// testV1Documents tests the /api/v1/documents endpoints.
// Note: These tests are currently skipped pending V1 API refactoring.
func testV1Documents(t *testing.T) {
	t.Skip("V1 documents endpoint requires Algolia refactoring - see REFACTORING_V1_ALGOLIA_HANDLERS.md")

	// TODO: Uncomment when V1 API is refactored to use search.Provider
	// suite := NewV1TestSuite(t)
	// defer suite.Cleanup()
	//
	// t.Run("GET returns documents", func(t *testing.T) {
	//     // Test implementation
	// })
}

// testV1Drafts tests the /api/v1/drafts endpoints.
// Note: These tests are currently skipped pending V1 API refactoring.
func testV1Drafts(t *testing.T) {
	t.Skip("V1 drafts endpoint requires Algolia refactoring - see REFACTORING_V1_ALGOLIA_HANDLERS.md")

	// TODO: Uncomment when V1 API is refactored to use search.Provider
	// suite := NewV1TestSuite(t)
	// defer suite.Cleanup()
	//
	// t.Run("GET returns drafts", func(t *testing.T) {
	//     // Test implementation
	// })
}

// testV1Reviews tests the /api/v1/reviews endpoints.
// Note: These tests are currently skipped pending V1 API refactoring.
func testV1Reviews(t *testing.T) {
	t.Skip("V1 reviews endpoint requires Algolia refactoring - see REFACTORING_V1_ALGOLIA_HANDLERS.md")

	// TODO: Uncomment when V1 API is refactored to use search.Provider
	// suite := NewV1TestSuite(t)
	// defer suite.Cleanup()
}

// testV1Approvals tests the /api/v1/approvals endpoints.
// Note: These tests are currently skipped pending V1 API refactoring.
func testV1Approvals(t *testing.T) {
	t.Skip("V1 approvals endpoint requires Algolia refactoring - see REFACTORING_V1_ALGOLIA_HANDLERS.md")

	// TODO: Uncomment when V1 API is refactored to use search.Provider
	// suite := NewV1TestSuite(t)
	// defer suite.Cleanup()
}
