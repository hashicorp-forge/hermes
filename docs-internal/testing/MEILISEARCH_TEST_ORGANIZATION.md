# Meilisearch Test Organization

## Summary

Reorganized Meilisearch adapter tests to properly separate unit tests from integration tests that require a running backend.

## Changes

### Removed from `pkg/search/adapters/meilisearch/adapter_test.go`
- `TestIntegration_IndexAndSearch` - This test required a running Meilisearch instance

### Kept in `pkg/search/adapters/meilisearch/adapter_test.go` (Unit Tests)
- `TestNewAdapter` - Tests adapter creation without backend
- `TestBuildMeilisearchFilters` - Tests filter string generation logic
- `TestConvertMeilisearchFacets` - Tests facet conversion logic  
- `TestAdapterInterfaces` - Compile-time interface verification

All unit tests pass without requiring Meilisearch ✓

### Integration Tests Location
Integration tests that require Meilisearch are in:
- `tests/integration/search/meilisearch_adapter_test.go`

These tests use testcontainers-go to automatically start Meilisearch and include:
- `TestMeilisearchAdapter_BasicUsage` - Basic search operations
- `TestMeilisearchAdapter_EdgeCases` - Edge cases and error handling

To run integration tests:
```bash
go test -tags=integration ./tests/integration/search/...
```

## Benefits

1. **Fast unit test feedback** - Unit tests run in ~0.5s without Docker
2. **Clear separation** - Easy to see which tests need infrastructure
3. **CI efficiency** - Unit tests can run in parallel without containers
4. **Developer experience** - Can run unit tests immediately without setup

## Test Results

### Unit Tests (No Backend Required)
```
=== RUN   TestNewAdapter
--- PASS: TestNewAdapter (0.03s)
=== RUN   TestBuildMeilisearchFilters
--- PASS: TestBuildMeilisearchFilters (0.00s)
=== RUN   TestConvertMeilisearchFacets
--- PASS: TestConvertMeilisearchFacets (0.00s)
=== RUN   TestAdapterInterfaces
--- PASS: TestAdapterInterfaces (0.00s)
PASS
ok      github.com/hashicorp-forge/hermes/pkg/search/adapters/meilisearch       0.531s
```

All unit tests pass without any external dependencies ✓

### Integration Tests (With Testcontainers)
Located in `tests/integration/search/` and run with testcontainers-go.

Note: The integration tests currently have some timeout issues that need to be addressed
separately by applying the timeout watchdog pattern. This is tracked in a separate issue.
