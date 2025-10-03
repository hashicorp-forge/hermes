# Integration Tests

This directory contains integration tests for Hermes components that require external services or filesystem access.

## Architecture

### Suite-Level Container Management

Integration tests use a **suite-level fixture pattern** where Docker containers are started once at the beginning of all tests and torn down at the end, rather than starting/stopping per test. This significantly improves test performance.

**Key Components:**

- **`fixture.go`**: Manages Docker containers using testcontainers-go
  - `SetupFixtureSuite()`: Starts containers once (called from TestMain)
  - `TeardownFixtureSuite()`: Stops all containers (called after all tests)
  - `GetFixture()`: Returns the global fixture instance
  - `GetPostgresURL()`: Helper for PostgreSQL connection string
  - `GetMeilisearchConfig()`: Helper for Meilisearch host/API key

- **`main_test.go`**: TestMain entry point that orchestrates container lifecycle
  - Calls `SetupFixtureSuite()` before running tests
  - Calls `TeardownFixtureSuite()` after tests complete

- **`fixture_test.go`**: Contains canary test and helper tests
  - `Test_00_Canary`: Runs first, verifies containers are healthy
  - Tests PostgreSQL connectivity and Meilisearch health endpoint

## Directory Structure

```
tests/integration/
├── fixture.go                  # Container fixture management
├── main_test.go               # TestMain entry point for suite
├── fixture_test.go            # Canary and helper tests
├── search/                    # Search adapter integration tests
│   ├── main_test.go           # TestMain for search package
│   └── meilisearch_adapter_test.go
└── workspace/                 # Workspace adapter integration tests
    └── local_adapter_test.go
```

## Quick Start

```bash
# Ensure Docker is running
docker ps

# Run all integration tests (containers start once at the beginning)
go test -tags=integration -v ./tests/integration/...

# Run just the canary test to verify container setup
go test -tags=integration -v ./tests/integration -run Test_00_Canary

# Run search adapter tests
go test -tags=integration -v ./tests/integration/search

# Run workspace adapter tests
go test -tags=integration -v ./tests/integration/workspace

# Use Makefile
make test/integration
```

## Running Integration Tests

Integration tests are tagged with `//go:build integration` and use **testcontainers-go** to automatically start required Docker containers.

### Prerequisites

- **Docker** must be running on your machine
- No need to manually start services - testcontainers handles this automatically

### Run All Integration Tests

```bash
# Testcontainers will automatically start PostgreSQL and Meilisearch once
go test -tags=integration ./tests/integration/...
```

### Run Specific Test Packages

```bash
# Search adapter tests (auto-starts Meilisearch via testcontainers)
go test -tags=integration ./tests/integration/search

# Workspace adapter tests (filesystem only, no containers needed)
go test -tags=integration ./tests/integration/workspace
```

### Run Individual Test Functions

```bash
# Run a specific test function
go test -tags=integration ./tests/integration/search -run TestMeilisearchAdapter_BasicUsage

# Run with verbose output to see container startup logs
go test -tags=integration -v ./tests/integration/...
```

## Test Fixture Architecture

### Testcontainers Integration

The integration tests use [testcontainers-go](https://golang.testcontainers.org/) to automatically manage Docker containers. This provides:

✅ **Automatic container management** - Containers start automatically when tests run
✅ **Isolation** - Each test run gets fresh containers
✅ **Cleanup** - Containers are automatically stopped after tests complete
✅ **No manual setup** - No need to run `make docker/meilisearch/start` manually
✅ **CI-friendly** - Works seamlessly in CI environments with Docker

### Fixture Usage Pattern

The `fixture.go` file provides a shared test fixture that uses a singleton pattern:

```go
func TestMyIntegrationTest(t *testing.T) {
    // Setup fixture - starts all containers on first call
    fixture := integration.SetupFixture(t)
    
    // Get connection details
    host, apiKey := fixture.MeilisearchHost, fixture.MeilisearchAPIKey
    postgresURL := fixture.PostgresURL
    
    // Use in your test...
}
```

**Key features:**
- **Singleton pattern**: Containers are started once per test run, shared across all tests
- **Automatic cleanup**: Containers are stopped via `t.Cleanup()` 
- **Thread-safe**: Uses mutex for concurrent test execution
- **Fast**: Reuses containers across test functions

### Container Configuration

**PostgreSQL:**
- Image: `postgres:17.1-alpine`
- Database: `db`
- User: `postgres`
- Password: `postgres`
- Connection provided via `fixture.PostgresURL`

**Meilisearch:**
- Image: `getmeili/meilisearch:v1.11`
- API Key: `masterKey123`
- Environment: `development`
- Connection provided via `fixture.MeilisearchHost` and `fixture.MeilisearchAPIKey`

## Test Coverage

### Search Adapter Tests (`tests/integration/search/`)

Tests automatically start Meilisearch via testcontainers.

**`TestMeilisearchAdapter_BasicUsage`** - Comprehensive test covering:
- Basic text search
- Filtered search (product, status)
- Faceted search (aggregations)
- Sorted search (by modifiedTime)
- Complex queries (multiple filters + sorting)
- Facet-only queries

**`TestMeilisearchAdapter_EdgeCases`** - Edge case testing:
- Empty index searches
- No results handling
- Pagination (multiple pages, last page)

### Workspace Adapter Tests (`tests/integration/workspace/`)

**`TestLocalAdapter_BasicUsage`** - Comprehensive test covering:
- Document creation
- Template-based document creation with placeholder replacement
- Document updates
- Folder hierarchy creation
- Document listing
- Document retrieval
- Document moving between folders

**`TestLocalAdapter_EdgeCases`** - Error handling:
- Nonexistent document operations
- Empty name validation
- Empty folder listing

**`TestLocalAdapter_ConcurrentOperations`** - Concurrency testing:
- Concurrent document creation
- Concurrent document updates

## Migration from pkg/ Examples

These integration tests replace the example code that was previously in:
- `pkg/search/adapters/meilisearch/examples/basic/main.go` (removed)
- `pkg/workspace/adapters/local/examples/main.go` (removed)

The example code has been converted to proper integration tests with:
- ✅ Assertions and error checking
- ✅ Test isolation and cleanup
- ✅ Proper build tags (`//go:build integration`)
- ✅ Subtests for different scenarios
- ✅ Edge case coverage
- ✅ Concurrency testing

## Best Practices

### Writing New Integration Tests

1. **Use build tags** - Always include `//go:build integration` at the top of test files
2. **Document prerequisites** - Clearly state what services must be running
3. **Clean up resources** - Use `defer` or test cleanup to remove test data
4. **Use unique identifiers** - Include PIDs or timestamps in test resource names
5. **Test isolation** - Each test should be independent and not rely on others
6. **Verify behavior** - Use assertions to verify expected outcomes, not just success

### Example Template

```go
//go:build integration
// +build integration

package mypackage

import (
    "testing"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestMyComponent_Integration(t *testing.T) {
    // Setup
    ctx := context.Background()
    // ... create resources
    
    // Cleanup
    defer cleanup()
    
    t.Run("BasicOperation", func(t *testing.T) {
        result, err := component.DoSomething(ctx)
        require.NoError(t, err, "Operation should succeed")
        assert.NotEmpty(t, result, "Should return result")
    })
}
```

## Continuous Integration

These integration tests work seamlessly in CI environments with testcontainers:

```yaml
# Example GitHub Actions workflow
jobs:
  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-go@v4
        with:
          go-version: '1.25'
      - name: Run integration tests
        run: go test -tags=integration -v ./tests/integration/...
```

**No manual service management needed** - testcontainers handles everything:
- ✅ Automatically pulls Docker images
- ✅ Starts containers
- ✅ Waits for health checks
- ✅ Runs tests
- ✅ Cleans up containers

## Troubleshooting

### Docker Not Running

**Error:** "Cannot connect to the Docker daemon"

**Solution:**
- Start Docker Desktop or your Docker service
- Verify Docker is running: `docker ps`

### Container Startup Failures

**Error:** "Failed to start PostgreSQL container" or similar

**Solution:**
```bash
# Check if ports are already in use
lsof -i :5432  # PostgreSQL
lsof -i :7700  # Meilisearch

# Stop any conflicting services
make docker/postgres/stop
make docker/meilisearch/stop

# Clean up any orphaned containers
docker ps -a | grep -E 'postgres|meilisearch' | awk '{print $1}' | xargs docker rm -f

# Re-run tests
go test -tags=integration ./tests/integration/...
```

### Workspace Tests Failing

**Error:** Permission denied or filesystem errors

**Solution:**
- Ensure `/tmp` directory is writable
- Check disk space: `df -h`
- Verify test cleanup is running (check for orphaned test directories)

### Test Timeout

**Error:** Test times out waiting for containers or index updates

**Solution:**
- Ensure Docker has sufficient resources (increase memory/CPU in Docker Desktop settings)
- Check Docker logs: `docker logs <container-id>`
- Increase timeout in testcontainers wait strategies (see `fixture.go`)
- Verify network connectivity

### Slow Test Execution

**Issue:** Tests take a long time to run

**Explanation:** First test run starts containers (can take 10-30 seconds), but subsequent tests in the same run reuse them. This is expected behavior.

**Tips:**
- Run specific test packages instead of all tests
- Use `-run` flag to run specific test functions
- Container startup is one-time cost per test run

## Related Documentation

- [API Integration Tests](../api/README.md) - Full API test suite with database
- [Unit Tests Guide](../../docs-internal/TODO_UNIT_TESTS.md) - Unit testing patterns
- [Search Abstraction](../../docs-internal/SEARCH_ABSTRACTION_IMPLEMENTATION.md) - Search layer design
- [Storage Abstraction](../../docs-internal/STORAGE_ABSTRACTION_PROPOSAL.md) - Storage layer design
