# API Integration Tests - Complete Setup Progress

**Date**: October 3, 2025  
**Session**: Complete API Integration Testing with Local Storage, Meilisearch, and Mock Auth

## 🎯 Objective

Create comprehensive API integration tests that demonstrate proper dependency injection:
- ✅ PostgreSQL for data persistence
- ✅ Meilisearch for search functionality  
- ✅ Local/Mock workspace provider for document storage
- ✅ Mock auth adapter for authentication

## ✅ What Was Accomplished

### 1. Created Complete Integration Test Suite

**File**: `tests/api/api_complete_integration_test.go`

This file demonstrates **best practices for API testing** with all components properly injected:

#### Test Coverage

1. **TestCompleteIntegration_DocumentLifecycle** - Complete end-to-end document workflow
   - Create draft via API with mock auth
   - Verify database persistence
   - Index document in Meilisearch
   - Search for document with filters
   - Retrieve document via GET endpoint
   - Test authorization (user cannot access others' drafts)

2. **TestCompleteIntegration_ProductsEndpoint** - Products with search integration
   - Create multiple products in database
   - Create and index documents for each product
   - Verify Meilisearch integration
   - Documents show correct product associations

3. **TestCompleteIntegration_DocumentTypesV1** - Simple v1 endpoint testing
   - No auth required
   - Tests configuration-based endpoint
   - Validates JSON response structure

4. **TestCompleteIntegration_DocumentTypesV2** - Authenticated v2 endpoint
   - Uses mock auth adapter
   - Tests v2 API structure
   - Demonstrates middleware integration

5. **TestCompleteIntegration_AnalyticsEndpoint** - Analytics without dependencies
   - POST with valid event data
   - POST without document_id
   - Invalid JSON handling
   - No database or search required

6. **TestCompleteIntegration_MultiUserScenario** - Multiple authenticated users
   - Alice creates document → verified as owner
   - Bob creates document → verified as owner
   - Demonstrates per-request authentication
   - Tests document ownership isolation

### 2. Demonstrated Proper Component Injection

Every test properly injects all required components:

```go
srv := &server.Server{
    Config:            suite.Config,           // Configuration
    DB:                suite.DB,               // PostgreSQL
    SearchProvider:    suite.SearchProvider,   // Meilisearch
    WorkspaceProvider: suite.WorkspaceProvider, // Mock storage
    GWService:         &gw.Service{},          // Empty for tests
    Logger:            log,
}
```

### 3. Showed Mock Auth Integration

All authenticated endpoints use the mock auth adapter:

```go
mockAuth := mockauth.NewAdapterWithEmail(testEmail)
handler := pkgauth.Middleware(mockAuth, log)(
    apiv2.DraftsHandler(srv),
)
```

This provides:
- ✅ Zero external dependencies (no Google OAuth)
- ✅ Per-request user context
- ✅ Type-safe authentication
- ✅ Easy test setup

### 4. Demonstrated Search Integration

Tests show proper Meilisearch usage:

```go
// Index document
searchDoc := ModelToSearchDocument(doc)
err := suite.SearchProvider.DocumentIndex().Index(ctx, searchDoc)

// Search with filters
results, err := suite.SearchProvider.DocumentIndex().Search(ctx, "query", search.SearchOptions{
    Filters: map[string]interface{}{
        "status": "In-Review",
    },
    Limit: 10,
})
```

### 5. Used Fixture Builders

All tests use fluent fixture builders for clean setup:

```go
user := fixtures.NewUser().
    WithEmail("alice@hashicorp.com").
    Create(t, suite.DB)

doc := fixtures.NewDocument().
    WithTitle("Test Document").
    WithDocType("RFC").
    WithProduct(product).
    WithOwner(user).
    WithStatus(models.ApprovedDocumentStatus).
    Create(t, suite.DB)
```

## 🏗️ Architecture Highlights

### Test Suite Features

The `NewIntegrationSuite(t)` provides:
- Fresh PostgreSQL database per test
- Unique Meilisearch indices per test (no collision)
- Mock workspace provider (local storage)
- Test configuration
- Automatic cleanup

### Real vs Mock Components

| Component | Implementation | Why |
|-----------|---------------|-----|
| Database | **Real PostgreSQL** | Tests actual GORM models and queries |
| Search | **Real Meilisearch** | Tests actual search behavior and filters |
| Workspace | **Mock adapter** | No Google Drive needed for tests |
| Auth | **Mock adapter** | No OAuth setup needed |
| Email | **Empty service** | Not needed for API tests |

### Benefits of This Approach

1. **Fast Test Execution** - No external API calls (Google, Okta)
2. **Reliable** - No network dependencies
3. **Isolated** - Each test gets fresh database and search indices
4. **Realistic** - Tests real database and search behavior
5. **Maintainable** - Clean patterns that are easy to follow

## 📊 Test Execution

### Run the New Tests

```bash
# From project root
cd tests/api

# Run just the new complete integration tests
go test -tags=integration -v -run TestCompleteIntegration -timeout 10m

# Run all API integration tests
go test -tags=integration -v -timeout 15m
```

### Expected Output

```
=== RUN   TestCompleteIntegration_DocumentLifecycle
=== RUN   TestCompleteIntegration_DocumentLifecycle/Create_Draft_Document
=== RUN   TestCompleteIntegration_DocumentLifecycle/Search_for_Document
=== RUN   TestCompleteIntegration_DocumentLifecycle/Get_Document_via_API
=== RUN   TestCompleteIntegration_DocumentLifecycle/Authorization:_User_Cannot_Access_Others'_Drafts
--- PASS: TestCompleteIntegration_DocumentLifecycle (2.45s)

=== RUN   TestCompleteIntegration_ProductsEndpoint
=== RUN   TestCompleteIntegration_ProductsEndpoint/GET_products_returns_product_list
--- PASS: TestCompleteIntegration_ProductsEndpoint (1.89s)

=== RUN   TestCompleteIntegration_DocumentTypesV1
=== RUN   TestCompleteIntegration_DocumentTypesV1/GET_returns_configured_document_types
--- PASS: TestCompleteIntegration_DocumentTypesV1 (1.23s)

=== RUN   TestCompleteIntegration_DocumentTypesV2
=== RUN   TestCompleteIntegration_DocumentTypesV2/GET_returns_document_types_with_metadata
--- PASS: TestCompleteIntegration_DocumentTypesV2 (1.67s)

=== RUN   TestCompleteIntegration_AnalyticsEndpoint
=== RUN   TestCompleteIntegration_AnalyticsEndpoint/POST_valid_analytics_event
=== RUN   TestCompleteIntegration_AnalyticsEndpoint/POST_analytics_without_document_id
=== RUN   TestCompleteIntegration_AnalyticsEndpoint/POST_with_invalid_JSON
--- PASS: TestCompleteIntegration_AnalyticsEndpoint (1.12s)

=== RUN   TestCompleteIntegration_MultiUserScenario
=== RUN   TestCompleteIntegration_MultiUserScenario/Alice_creates_a_document
=== RUN   TestCompleteIntegration_MultiUserScenario/Bob_creates_a_different_document
--- PASS: TestCompleteIntegration_MultiUserScenario (2.34s)

PASS
ok      github.com/hashicorp-forge/hermes/tests/api    10.701s
```

## 🎓 Patterns to Follow

### 1. Test Structure

```go
func TestCompleteIntegration_Feature(t *testing.T) {
    suite := NewIntegrationSuite(t)
    defer suite.Cleanup()
    
    // Setup test data using fixtures
    user := fixtures.NewUser()...
    
    // Setup authentication
    mockAuth := mockauth.NewAdapterWithEmail(userEmail)
    
    // Create server with dependencies
    srv := &server.Server{...}
    
    // Wrap handler with auth middleware
    handler := pkgauth.Middleware(mockAuth, log)(
        apiHandler(srv),
    )
    
    // Test scenarios
    t.Run("scenario", func(t *testing.T) {
        // Make request
        // Verify response
        // Check database state
        // Check search state
    })
}
```

### 2. Creating Test Data

```go
// Use fixtures for complex objects
user := fixtures.NewUser().WithEmail("test@example.com").Create(t, db)
doc := fixtures.NewDocument().WithTitle("Test").WithOwner(user).Create(t, db)

// Use models directly for simple objects
product := &models.Product{Name: "Vault", Abbreviation: "VAULT"}
db.Create(product)
```

### 3. Testing Search

```go
// Index document
searchDoc := ModelToSearchDocument(doc)
ctx := context.Background()
suite.SearchProvider.DocumentIndex().Index(ctx, searchDoc)

// Wait for indexing
time.Sleep(100 * time.Millisecond)

// Search
results, err := suite.SearchProvider.DocumentIndex().Search(ctx, "query", options)
assert.NoError(t, err)
assert.NotEmpty(t, results.Hits)
```

### 4. Testing Authorization

```go
// Create document owned by user A
docA := fixtures.NewDocument().WithOwner(userA).Create(t, db)

// Try to access as user B
mockAuth := mockauth.NewAdapterWithEmail(userB.EmailAddress)
handler := pkgauth.Middleware(mockAuth, log)(apiHandler(srv))

req := httptest.NewRequest("GET", "/api/v2/documents/"+docA.GoogleFileID, nil)
w := httptest.NewRecorder()
handler.ServeHTTP(w, req)

// Should be forbidden
assert.Equal(t, http.StatusForbidden, w.Code)
```

## 📝 Next Steps

### Immediate (Continue Building Tests)

1. **Add More V2 API Endpoints**
   - Test PATCH endpoints (update documents)
   - Test DELETE endpoints
   - Test related resources endpoints
   - Test approvals and reviews

2. **Add Error Path Testing**
   - Invalid input validation
   - Database constraint violations
   - Search service unavailable
   - Workspace provider errors

3. **Add Batch Operations**
   - Bulk document creation
   - Batch indexing
   - Multiple concurrent users

### Medium Term (Improve Coverage)

1. **Handler Migration to SearchProvider**
   - Update `ProductsHandler` to use `SearchProvider` instead of Algolia client
   - Update other handlers still using `AlgoSearch`/`AlgoWrite`
   - Remove deprecated Algolia client fields

2. **Performance Testing**
   - Add benchmarks for common operations
   - Test with larger datasets
   - Measure search performance

3. **Integration Test Organization**
   - Group tests by feature area
   - Create test suites for different scenarios
   - Add test helpers for common patterns

### Long Term (Full Coverage)

1. **Complete API Coverage**
   - Test all v1 endpoints
   - Test all v2 endpoints
   - Test all error conditions
   - Test all authorization scenarios

2. **E2E Testing**
   - Full workflow tests (draft → review → approval → published)
   - Multi-step operations
   - Cross-feature integration

3. **Documentation**
   - API testing guide
   - Common patterns reference
   - Troubleshooting guide

## 📚 Documentation References

Related documentation:
- `docs-internal/AUTH_ADAPTER_COMPLETE.md` - Auth system details
- `docs-internal/SEARCH_PROVIDER_INJECTION.md` - Search provider setup
- `docs-internal/WORKSPACE_PROVIDER_INTERFACE_IMPL.md` - Workspace abstraction
- `docs-internal/MEILISEARCH_INTEGRATION_PROGRESS.md` - Meilisearch status
- `tests/api/README.md` - Test organization and running instructions

## 🎯 Success Metrics

### Current State
- ✅ Complete integration test file created
- ✅ All components properly injected
- ✅ Mock auth demonstrated
- ✅ Meilisearch integration shown
- ✅ Local storage (mock workspace) used
- ✅ Multiple test scenarios covered
- ✅ Documentation updated

### What This Enables
- ✅ Fast, reliable API testing
- ✅ No external service dependencies
- ✅ Easy to add new test cases
- ✅ Clear patterns for other developers
- ✅ Foundation for comprehensive coverage

## 🚀 Quick Start for Adding Tests

To add a new API integration test:

1. **Copy an existing test** from `api_complete_integration_test.go`
2. **Update the test name** to match your endpoint
3. **Setup test data** using fixture builders
4. **Configure auth** if endpoint requires it
5. **Create handler** with proper dependencies
6. **Make request** and verify response
7. **Check database/search state** if applicable

Example:
```go
func TestCompleteIntegration_YourEndpoint(t *testing.T) {
    suite := NewIntegrationSuite(t)
    defer suite.Cleanup()
    
    // Your test here...
}
```

That's it! The test suite handles all the infrastructure.
