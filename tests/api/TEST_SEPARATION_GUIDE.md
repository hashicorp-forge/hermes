# Test Separation Guide

## Overview

The API tests have been reorganized to separate **unit tests** from **integration tests**, with integration tests now using **testcontainers-go** for automatic infrastructure setup.

## Changes Made

### 1. Test File Organization

#### Unit Tests (`unit_test.go`)
- **No build tags** - runs by default with `go test`
- **No external dependencies** - no PostgreSQL, no Meilisearch
- Tests pure business logic, fixtures, builders, and converters
- Fast execution (~100ms total)

#### Integration Tests (multiple files)
- **`// +build integration` tag** at top of file
- Requires Docker for testcontainers
- Tests full API endpoints, database operations, and search functionality
- Files: `integration_test.go`, `integration_containers_test.go`, `documents_test.go`, `optimized_test.go`

### 2. Testcontainers Integration

New file: `integration_containers_test.go`

Features:
- `TestContainersContext` - manages PostgreSQL and Meilisearch containers
- `SetupTestContainers(t)` - starts containers automatically
- `NewIntegrationSuite(t)` - creates test suite with containerized dependencies
- Automatic cleanup on test completion

### 3. Updated Makefile Targets

```makefile
# Unit tests only (fast, no dependencies)
make test/api/unit

# Integration tests with testcontainers (requires Docker)
make test/api/integration

# Integration tests with local docker-compose (alternative)
make test/api/integration/local

# All API tests (unit + integration)
make test/api

# Project-wide test targets
make test/unit              # All unit tests
make test/integration       # All integration tests  
make test                   # All tests (unit + integration)
```

### 4. Enhanced Documentation

Updated `README.md` with:
- Clear separation of unit vs integration tests
- Testcontainers setup and benefits
- Performance comparison table
- Running instructions for each test type
- Writing new tests guide

### 5. Dependencies Added

```
go get github.com/testcontainers/testcontainers-go
go get github.com/testcontainers/testcontainers-go/modules/postgres
```

## Migration Guide

### Running Tests

#### Before (Required Manual Setup)
```bash
# Start services manually
make docker/dev/start

# Run tests
cd tests/api && go test -v
```

#### After

**Unit Tests (Fast)**
```bash
make test/api/unit          # No Docker required
```

**Integration Tests (Automatic)**
```bash
make test/api/integration   # Testcontainers starts everything
```

### Writing New Tests

#### Unit Test Example
```go
// unit_test.go
func TestMyFeature_Unit(t *testing.T) {
    // Test pure logic, no external dependencies
    result := MyPureFunction(input)
    assert.Equal(t, expected, result)
}
```

#### Integration Test Example
```go
// +build integration

// my_integration_test.go
package api

func TestMyFeature_Integration(t *testing.T) {
    suite := NewIntegrationSuite(t)
    defer suite.Cleanup()
    
    // Test with real database and search
    doc := fixtures.NewDocument().Create(t, suite.DB)
    // ... rest of test
}
```

### Updating Existing Tests

1. **Unit tests** → Move to `unit_test.go` or create new file without build tag
2. **Integration tests** → Add `// +build integration` at top of file
3. **Change suite creation** → Replace `NewSuite(t)` with `NewIntegrationSuite(t)`

## Benefits

### 1. Fast Feedback Loop
- Unit tests run in ~100ms
- No waiting for Docker containers
- CI can run unit tests without Docker

### 2. Reliable Integration Tests
- Testcontainers ensures consistent environment
- No "works on my machine" issues
- Automatic cleanup prevents state leakage

### 3. Clear Test Intent
- Unit tests focus on logic correctness
- Integration tests focus on behavior and integration
- Easier to understand test failures

### 4. Better CI Performance
- Unit tests run on every commit (fast)
- Integration tests run on PR/merge (thorough)
- Parallel execution possible

### 5. Easier Onboarding
- New developers don't need manual setup for integration tests
- Just need Docker installed
- Testcontainers handles the rest

## Testcontainers Details

### What It Does
1. Detects Docker environment
2. Pulls required container images (PostgreSQL, Meilisearch)
3. Starts containers with unique names/ports
4. Waits for services to be healthy
5. Runs tests
6. Terminates and removes containers

### Container Configuration

**PostgreSQL:**
- Image: `postgres:17.1-alpine`
- Database: `hermes_test`
- User: `postgres`
- Password: `postgres`
- Wait strategy: Log message "database system is ready to accept connections" (2 occurrences)

**Meilisearch:**
- Image: `getmeili/meilisearch:v1.10`
- Master key: `masterKey123`
- Port: 7700
- Wait strategy: HTTP health check on `/health`

### Performance

| Phase | Duration |
|-------|----------|
| Container startup | ~10-30s (first time slower due to image pull) |
| Test execution | ~1-5s per test |
| Container cleanup | ~2-5s |
| **Total** | **~15-60s** |

Subsequent runs are faster as images are cached.

## Troubleshooting

### Docker Not Running
```
Error: Cannot connect to Docker daemon
```
**Solution:** Start Docker Desktop

### Containers Not Starting
```
Error: Failed to start container
```
**Solution:** 
- Check Docker logs
- Ensure ports 5432 and 7700 are available
- Try `docker system prune` to clean up

### Tests Timing Out
```
Error: context deadline exceeded
```
**Solution:**
- Increase timeout: `go test -timeout 20m`
- Check Docker resource limits
- Ensure adequate disk space

### Local Docker Compose Conflicts
```
Error: port already allocated
```
**Solution:**
- Stop local compose: `make docker/dev/stop`
- Testcontainers uses different ports automatically

## Future Enhancements

1. **Parallel test execution** - Run integration tests in parallel with isolated containers
2. **Test data fixtures** - Reusable test data sets
3. **Performance benchmarks** - Track test suite performance over time
4. **Mock search provider** - Add mock option for faster integration tests that don't need search
5. **Test coverage tracking** - Measure and improve test coverage

## Questions?

- Check `README.md` for detailed usage
- Review `integration_containers_test.go` for testcontainers setup
- Look at `unit_test.go` for unit test examples
- Examine `integration_test.go` for integration test examples
