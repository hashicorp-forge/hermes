# Hermes API Tests

This directory contains **unit tests** and **integration tests** for the Hermes API.

## Test Structure

Tests are separated into two categories:

### Unit Tests
- **No external dependencies** (no PostgreSQL, no Meilisearch)
- Test pure business logic, builders, utilities, and type conversions
- Fast execution (~milliseconds)
- Run by default with `go test`

### Integration Tests
- Require external dependencies (PostgreSQL + Meilisearch)
- Use `testcontainers-go` to automatically spin up Docker containers
- Test full API endpoints, database operations, and search functionality
- Tagged with `// +build integration`
- Slower execution (~seconds to minutes)
- Run with `go test -tags=integration`

## Directory Structure

```
tests/api/
├── README.md                        # This file
├── unit_test.go                     # Unit tests (no dependencies)
├── integration_test.go              # Integration tests (requires containers)
├── integration_containers_test.go   # Testcontainers setup
├── documents_test.go                # Document API integration tests
├── optimized_test.go                # Performance optimization tests
├── suite.go                         # Test suite setup and helpers
├── client.go                        # HTTP test client with fluent assertions
├── helpers.go                       # Transaction helpers
├── fixtures/
│   └── builders.go                  # Fluent builders for test data
└── helpers/
    └── assertions.go                # Custom assertion helpers
```

## Running Tests

### Run Unit Tests Only (Fast, No Dependencies)

```bash
# From project root
make test/api/unit

# Or directly
cd tests/api
go test -v -short
```

This runs tests like:
- `TestFixtures_DocumentBuilder`
- `TestFixtures_UserBuilder`
- `TestModelToSearchDocument_Unit`
- `TestClient_Unit`
- etc.

### Run Integration Tests (Requires Docker)

Integration tests use **testcontainers-go** to automatically:
1. Start PostgreSQL container (17.1-alpine)
2. Start Meilisearch container (v1.10)
3. Run tests against real services
4. Clean up containers after tests

```bash
# From project root (recommended)
make test/api/integration

# Or directly
cd tests/api
go test -v -tags=integration -timeout 15m
```

**Requirements:**
- Docker must be running
- No need to manually start containers (testcontainers handles this)

### Run Integration Tests Against Local Docker Compose (Alternative)

If you already have services running via `docker-compose`:

```bash
# Start services first
make docker/dev/start

# Run tests against local services
make test/api/integration/local
```

### Run All Tests (Unit + Integration)

```bash
# From project root
make test/api

# This runs:
# 1. Unit tests (fast)
# 2. Integration tests with testcontainers (slower)
```

### Run Specific Tests

```bash
cd tests/api

# Run specific unit test
go test -v -run TestFixtures_DocumentBuilder

# Run specific integration test
go test -v -tags=integration -run TestDatabase_CreateDocument
```

## Writing Tests

### Unit Test Example

```go
// unit_test.go - No build tags, runs by default
package api

func TestFixtures_DocumentBuilder(t *testing.T) {
    // No suite needed - tests pure logic
    builder := fixtures.NewDocument().
        WithGoogleFileID("test-123").
        WithTitle("Test RFC")
    
    assert.NotNil(t, builder)
}

func TestModelToSearchDocument_Unit(t *testing.T) {
    doc := &models.Document{
        GoogleFileID: "test-123",
        Title:        "Test Document",
        DocumentType: models.DocumentType{Name: "RFC"},
    }
    
    searchDoc := ModelToSearchDocument(doc)
    assert.Equal(t, "test-123", searchDoc.ObjectID)
}
```

### Integration Test Example

```go
// integration_test.go - Requires integration build tag
// +build integration

package api

func TestDatabase_CreateDocument(t *testing.T) {
    // Use NewIntegrationSuite which starts testcontainers
    suite := NewIntegrationSuite(t)
    defer suite.Cleanup()

    // Create test document in database
    doc := fixtures.NewDocument().
        WithGoogleFileID("test-123").
        WithTitle("Test RFC").
        Create(t, suite.DB)

    // Index in search
    searchDoc := ModelToSearchDocument(doc)
    err := suite.SearchProvider.DocumentIndex().Index(suite.Ctx, searchDoc)
    require.NoError(t, err)

    // Test the API
    resp := suite.Client.Get("/api/v1/documents/test-123")
    resp.AssertStatusOK()

    var result map[string]interface{}
    resp.DecodeJSON(&result)
    assert.Equal(t, "Test RFC", result["title"])
}
```

## Test Suite Features

### Unit Tests
- **No external dependencies** - pure Go testing
- **Fast feedback** - runs in milliseconds
- **CI-friendly** - no Docker required
- Tests: fixtures, builders, converters, utilities

### Integration Tests with Testcontainers
- **Automatic container management** - starts/stops PostgreSQL and Meilisearch
- **Isolated environments** - each test suite gets fresh containers
- **Reliable cleanup** - containers terminated after tests
- **Parallel-safe** - containers use unique names/ports

### Database Management (Integration)
- Fresh PostgreSQL database per test suite
- Auto-migrates all models
- Seeds with essential data (document types, products)
- Transaction-based test isolation with `WithTransaction`
- Automatic cleanup

### Search Integration (Integration)
- Uses Meilisearch for real search operations
- Unique test indexes per suite
- Automatic index cleanup
- Tests search, filtering, faceting

### HTTP Testing (Integration)
- Fluent HTTP client with method chaining
- Automatic JSON encoding/decoding
- Built-in assertions for common status codes
- Real HTTP server with full middleware

## Benefits of Separation

### Why Separate Unit and Integration Tests?

1. **Fast Feedback Loop**: Unit tests run in ~100ms, giving instant feedback
2. **CI Efficiency**: Unit tests run in CI without Docker overhead
3. **Clear Test Intent**: Unit tests focus on logic, integration tests focus on behavior
4. **Better Coverage**: Can test edge cases in units without slow setup
5. **Reliability**: Testcontainers ensures integration tests work across environments

### Testcontainers Advantages

- **No manual setup**: Containers start automatically
- **Version control**: Container versions defined in code
- **Cleanup guaranteed**: Containers removed even if tests panic
- **Parallel execution**: Each suite gets isolated containers
- **Real dependencies**: Tests run against actual PostgreSQL and Meilisearch

## Performance Comparison

| Test Type | Setup Time | Execution | Dependencies |
|-----------|-----------|-----------|--------------|
| Unit | <10ms | <100ms | None |
| Integration (testcontainers) | ~10-30s | ~1-5s/test | Docker |
| Integration (docker-compose) | Manual | ~1-5s/test | PostgreSQL + Meilisearch running |

## Makefile Targets Reference

```bash
make test/api/unit              # Unit tests only (fast, no Docker)
make test/api/integration       # Integration tests with testcontainers
make test/api/integration/local # Integration tests with docker-compose
make test/api                   # All API tests (unit + integration)
make test/api/quick             # Quick smoke test (single unit test)

make test/unit                  # All unit tests in project
make test/integration           # All integration tests in project
make test                       # All tests (unit + integration)
```

## Current Status

### ✅ What Works
- **Unit tests** for fixtures, builders, converters
- **Integration tests** with testcontainers-go
- Database setup with auto-migration and seeding
- Meilisearch integration for search operations  
- HTTP test client with fluent assertions
- Fixture builders for creating test data
- Automatic container lifecycle management

### ⚠️ Known Issues
1. **Algolia Integration**: The existing API handlers (`internal/api/documents.go`) are tightly coupled to Algolia's concrete types, making them difficult to test without a real Algolia instance. The tests use Meilisearch through the new search abstraction layer, but the handlers still call Algolia directly.

2. **Solution Paths**:
   - **Option A** (Recommended): Create new API v2 handlers that use the search abstraction layer instead of Algolia directly. This would make them easily testable.
   - **Option B**: Add an Algolia test instance to the docker-compose setup
   - **Option C**: Refactor existing handlers to accept a search provider interface

### 🚧 TODO
- [ ] Fix API handler integration (see Known Issues above)
- [ ] Add tests for drafts endpoints
- [ ] Add tests for projects endpoints
- [ ] Add tests for reviews endpoints
- [ ] Add tests for me/subscriptions endpoints
- [ ] Add authentication testing support
- [ ] Add more fixture builders (Project, Review, etc.)
- [ ] Add integration tests for the full document lifecycle

## Configuration

### Environment Variables

- `HERMES_TEST_POSTGRESQL_DSN`: PostgreSQL connection string
  - Default: `host=localhost user=postgres password=postgres port=5432 sslmode=disable`
- `HERMES_TEST_MEILISEARCH_HOST`: Meilisearch server URL
  - Default: `http://localhost:7700`

## Architecture Notes

### Why the Test Suite?
The test suite provides a complete, isolated environment for each test:
- Fresh database per test (no data pollution)
- Real search backend (Meilisearch) for testing search functionality
- HTTP server running the actual API handlers
- Automatic cleanup to prevent resource leaks

### Design Principles
1. **Isolation**: Each test is independent and doesn't affect others
2. **Real Dependencies**: Use real PostgreSQL and Meilisearch when possible
3. **Fast Feedback**: Tests should run quickly and provide clear error messages
4. **Maintainability**: Fluent APIs and builders make tests easy to write and read

## Future Improvements

1. **Parallel Testing**: Currently disabled due to database contention
2. **Test Data Versioning**: Add ability to load specific test data scenarios
3. **Performance Testing**: Add benchmarks for critical endpoints
4. **Contract Testing**: Verify API responses match expected schemas
5. **Mock Modes**: Add ability to run tests with all mocks for CI speed
