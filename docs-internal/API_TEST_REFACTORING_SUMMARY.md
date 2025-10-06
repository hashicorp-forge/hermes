# API Test Suite Refactoring - Quick Reference

**Date**: October 5, 2025  
**Status**: ✅ Infrastructure Complete - Ready for Test Migration

## What Changed

Refactored API test suite from flat structure to hierarchical architecture:

- **Before**: Tests in multiple files (api_complete_integration_test.go, v2_drafts_test.go, etc.)
- **After**: Hierarchical suites (TestAPIComplete → TestV1Suite/TestV2Suite → endpoint tests)

## Key Benefits

1. **40 seconds faster** - Docker containers start once, not per-test
2. **Better organized** - Clear V1/V2 separation
3. **More flexible** - Run all, V1 only, V2 only, or specific endpoints
4. **Better isolated** - Unique DB schemas and doc IDs per test
5. **Simpler** - Mock workspace adapter (no filesystem complexity)

## Running Tests

```bash
# All API tests (V1 + V2)
go test -tags=integration -v ./tests/api/ -run TestAPIComplete -timeout 5m

# Only V1 tests
go test -tags=integration -v ./tests/api/ -run TestV1Suite -timeout 5m

# Only V2 tests
go test -tags=integration -v ./tests/api/ -run TestV2Suite -timeout 5m

# Specific endpoint
go test -tags=integration -v ./tests/api/ -run TestV1Suite/DocumentTypes
go test -tags=integration -v ./tests/api/ -run TestV2Suite/Drafts
```

## New Test Structure

```
tests/api/
├── main_test.go              # TestMain - starts Docker containers once
├── suite_main.go             # MainTestSuite - shared infrastructure
├── suite_v1_test.go          # V1TestSuite - V1 API tests
├── suite_v2_test.go          # V2TestSuite - V2 API tests
├── suite_complete_test.go    # TestAPIComplete - runs V1 + V2
├── client.go                 # Enhanced HTTP client with fluent API
└── fixtures/                 # Test data builders
```

## Adding New Tests

```go
// In suite_v1_test.go or suite_v2_test.go

func testV1MyEndpoint(t *testing.T) {
    suite := NewV1TestSuite(t)
    defer suite.Cleanup()
    
    // Available resources:
    // - suite.DB                 (isolated PostgreSQL schema)
    // - suite.SearchProvider     (Meilisearch with unique indexes)
    // - suite.WorkspaceProvider  (mock workspace adapter)
    // - suite.Config             (test configuration)
    // - suite.GetUniqueDocID()   (generate unique doc IDs)
    
    // Create test data
    docID := suite.GetUniqueDocID("mydoc")
    doc := fixtures.NewDocument().
        WithGoogleFileID(docID).
        WithTitle("Test Document").
        WithProduct("Test Product").
        WithDocType("RFC").
        Create(t, suite.DB)
    
    // Create handler and test
    handler := api.MyHandler(suite.Config, suite.DB, suite.SearchProvider)
    
    req := httptest.NewRequest("GET", "/api/v1/my-endpoint", nil)
    w := httptest.NewRecorder()
    handler.ServeHTTP(w, req)
    
    assert.Equal(t, 200, w.Code)
}

// Add to test suite runner
func TestV1Suite(t *testing.T) {
    t.Run("MyEndpoint", testV1MyEndpoint)
    // ... other tests
}
```

## Next Steps

1. **Migrate existing tests** - Copy working tests from old files to new suite structure
2. **Remove old files** - After migration: api_complete_integration_test.go, v2_*.go
3. **Add new tests** - Use new framework for better organization

## Migration Checklist

- [ ] Migrate api_v1_test.go tests to suite_v1_test.go
- [ ] Migrate v2_drafts_test.go tests to suite_v2_test.go  
- [ ] Migrate v2_products_test.go tests to suite_v2_test.go
- [ ] Migrate api_complete_integration_test.go tests to appropriate suites
- [ ] Remove old test files
- [ ] Update CI/CD to use new test commands
- [ ] Consider migrating to local workspace adapter with afero

## Questions?

See `docs-internal/API_INTEGRATION_TEST_STATUS.md` for full details and history.
