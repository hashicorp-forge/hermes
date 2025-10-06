# Speeding Up Integration Tests in Go

**Date**: October 5, 2025  
**Context**: Hermes integration tests optimization

## Quick Answer

Yes! Go has **excellent** built-in support for parallel test execution. Here are the main strategies:

## 1. Use `t.Parallel()` in Test Functions ⚡

### Current State
Only 1 test out of hundreds uses `t.Parallel()`:
```bash
$ grep -r "t.Parallel()" **/*_test.go
tests/api/optimized_test.go:122:    t.Parallel() // This test can run in parallel
```

### How It Works

```go
func TestSomething(t *testing.T) {
    t.Parallel() // Mark this test as safe to run in parallel
    
    // Test code here...
}

func TestAnotherThing(t *testing.T) {
    t.Parallel() // This will run concurrently with TestSomething
    
    // Test code here...
}
```

**Important**: Tests marked with `t.Parallel()` run concurrently with other parallel tests. Tests without it run sequentially.

### Best Practices

✅ **Safe to parallelize**:
- Tests with isolated resources (temp directories, separate DB schemas)
- Read-only operations
- Tests using mocks/fakes
- Tests with unique index names (like our Meilisearch tests)

❌ **NOT safe to parallelize**:
- Tests sharing the same database without isolation
- Tests modifying global state
- Tests with file locks on same files
- Tests depending on execution order

## 2. Control Parallelism with `-parallel` Flag 🚀

### Command Line

```bash
# Default: GOMAXPROCS parallel tests (usually CPU count)
go test ./...

# Run up to 10 tests in parallel
go test -parallel 10 ./...

# Run up to 20 tests in parallel (aggressive)
go test -parallel 20 ./...

# Run only 1 test at a time (debugging)
go test -parallel 1 ./...
```

### Environment Variable

```bash
# Set default parallelism
export GOMAXPROCS=8
go test ./...
```

## 3. Package-Level Parallelism 📦

Go **automatically** runs tests from different packages in parallel!

```bash
# These run in parallel automatically:
go test ./pkg/search/... ./pkg/workspace/... ./internal/api/...
```

### Current Makefile Optimization Opportunity

Our Makefile runs tests sequentially:

```makefile
# CURRENT (Sequential)
go/test:
	go test -coverprofile=build/coverage/coverage.out ./...

# OPTIMIZED (Parallel + faster timeout)
go/test:
	go test -parallel 4 -timeout 5m -coverprofile=build/coverage/coverage.out ./...
```

## 4. Integration Test Optimization Strategy 🎯

### Current Integration Test Issues

1. **No `t.Parallel()` usage** - All tests run sequentially
2. **Shared containers** - TestMain starts containers, all tests share them
3. **No resource isolation** - Tests might interfere with each other

### Recommended Approach: Hybrid Strategy

```go
// tests/integration/search/meilisearch_adapter_test.go

func TestMeilisearchAdapter_BasicUsage(t *testing.T) {
    // DON'T parallelize the outer test - it sets up shared context
    
    integration.WithTimeout(t, 40*time.Second, 10*time.Second, 
        func(ctx context.Context, progress func(string)) {
        
        // Get shared fixture
        host, apiKey := integration.GetMeilisearchConfig()
        
        // Use UNIQUE index name per test to avoid collisions
        indexPrefix := fmt.Sprintf("test-%d-%d", os.Getpid(), time.Now().UnixNano())
        
        adapter, err := meilisearch.NewAdapter(&meilisearch.Config{
            Host:            host,
            APIKey:          apiKey,
            DocsIndexName:   indexPrefix + "-docs",
            DraftsIndexName: indexPrefix + "-drafts",
        })
        require.NoError(t, err)
        
        // NOW subtests can be parallel - they have isolated indexes
        t.Run("BasicSearch", func(t *testing.T) {
            t.Parallel() // ✅ Safe - unique index name
            // test code...
        })
        
        t.Run("FilteredSearch", func(t *testing.T) {
            t.Parallel() // ✅ Safe - unique index name
            // test code...
        })
        
        t.Run("FacetedSearch", func(t *testing.T) {
            t.Parallel() // ✅ Safe - unique index name
            // test code...
        })
    })
}
```

## 5. Benchmark: Expected Speedups 📊

### Scenario 1: Adding `t.Parallel()` to Subtests

**Current**: 10 subtests × 2 seconds each = 20 seconds  
**With Parallel**: 10 subtests ÷ 4 cores = 5 seconds (4x speedup)

### Scenario 2: Increasing `-parallel` Flag

**Current** (default GOMAXPROCS=8):
```bash
$ time go test -tags=integration ./tests/integration/search/...
# ~30 seconds
```

**Optimized** (parallel=16):
```bash
$ time go test -parallel 16 -tags=integration ./tests/integration/search/...
# ~15-20 seconds (1.5-2x speedup)
```

### Scenario 3: Package-Level Parallelism (Already Happening)

```bash
# This already runs packages in parallel:
$ go test ./tests/integration/search/... ./tests/integration/workspace/...
```

## 6. Implementation Plan 🗺️

### Phase 1: Low-Risk Wins (30 minutes)

1. **Update Makefile** - Add `-parallel` flag to test targets:
```makefile
go/test:
	go test -parallel 4 -timeout 5m -coverprofile=$(COVERAGE_DIR)/coverage.out ./...

go/test/integration:
	go test -parallel 8 -tags=integration -timeout 10m -v ./tests/integration/...
```

2. **Add `t.Parallel()` to safe subtests** - Tests already using unique resources:
   - Meilisearch tests with unique index names
   - Local adapter tests with temp directories
   - Read-only search tests

### Phase 2: Resource Isolation (1-2 hours)

1. **Update test fixtures** to generate unique resource names:
```go
// Helper function for unique naming
func UniqueTestName(t *testing.T) string {
    return fmt.Sprintf("%s-%d-%d", 
        strings.ReplaceAll(t.Name(), "/", "-"),
        os.Getpid(), 
        time.Now().UnixNano())
}

// Usage in tests
indexName := UniqueTestName(t) + "-docs"
```

2. **Add `t.Parallel()` to all isolated tests**

3. **Add resource cleanup** with `t.Cleanup()`:
```go
t.Cleanup(func() {
    // Clean up test-specific resources
    docIndex.DeleteIndex(ctx)
})
```

### Phase 3: Container Optimization (2-4 hours)

1. **Option A: Shared containers with isolated resources** (recommended)
   - Keep TestMain starting shared containers
   - Each test creates unique indexes/schemas
   - Fast startup, good isolation

2. **Option B: Per-test containers** (slower but more isolated)
   - Each test starts its own containers
   - Complete isolation
   - Slower due to container startup overhead

## 7. Quick Wins You Can Implement Now 🎁

### Update 1: Makefile (30 seconds)

```makefile
# Add to Makefile - instant speedup for all test runs
go/test:
	go test -parallel 4 -timeout 5m -coverprofile=$(COVERAGE_DIR)/coverage.out ./...

go/test/integration:
	go test -parallel 8 -tags=integration -timeout 10m -v ./tests/integration/...
```

### Update 2: Integration Test Subtests (5 minutes per file)

```go
// In tests/integration/search/meilisearch_adapter_test.go

t.Run("BasicSearch", func(t *testing.T) {
    t.Parallel() // ADD THIS LINE ✅
    // ... existing test code
})

t.Run("FilteredSearch", func(t *testing.T) {
    t.Parallel() // ADD THIS LINE ✅
    // ... existing test code
})

// Repeat for all subtests that use unique index names
```

### Update 3: Test Timeouts (1 minute)

```go
// Reduce timeouts for faster feedback
integration.WithTimeout(t, 
    20*time.Second,  // Reduced from 40s
    5*time.Second,   // Reduced from 10s
    func(ctx context.Context, progress func(string)) {
        // Test code...
    })
```

## 8. Common Pitfalls ⚠️

### ❌ Race Conditions
```go
var sharedCounter int // DANGER: shared state

func TestA(t *testing.T) {
    t.Parallel()
    sharedCounter++ // RACE CONDITION!
}

func TestB(t *testing.T) {
    t.Parallel()
    sharedCounter++ // RACE CONDITION!
}
```

**Solution**: Use test-local variables or proper synchronization.

### ❌ Shared File Resources
```go
func TestA(t *testing.T) {
    t.Parallel()
    os.WriteFile("test.txt", []byte("A"), 0644) // CONFLICT!
}

func TestB(t *testing.T) {
    t.Parallel()
    os.WriteFile("test.txt", []byte("B"), 0644) // CONFLICT!
}
```

**Solution**: Use unique file names per test.

### ❌ Database Table Conflicts
```go
func TestA(t *testing.T) {
    t.Parallel()
    db.Exec("TRUNCATE TABLE users") // AFFECTS OTHER TESTS!
}

func TestB(t *testing.T) {
    t.Parallel()
    db.Query("SELECT * FROM users") // MIGHT SEE TRUNCATED TABLE!
}
```

**Solution**: Use transactions with rollback, or separate test schemas.

## 9. Verification Tools 🔧

### Check for Race Conditions
```bash
# Run tests with race detector
go test -race -parallel 10 ./...

# Integration tests with race detector
go test -race -parallel 10 -tags=integration ./tests/integration/...
```

### Measure Speedup
```bash
# Before optimization
time go test -tags=integration ./tests/integration/...

# After optimization
time go test -parallel 8 -tags=integration ./tests/integration/...

# Calculate speedup
# Speedup = Before_Time / After_Time
```

### Profile Test Execution
```bash
# Generate test profile
go test -cpuprofile cpu.prof -memprofile mem.prof ./...

# Analyze profile
go tool pprof cpu.prof
```

## 10. Recommended Next Steps for Hermes

### Immediate (Do Now - 15 minutes)

1. **Update Makefile** with `-parallel` flags
2. **Add `t.Parallel()` to Meilisearch subtests** (already using unique indexes)
3. **Add `t.Parallel()` to local adapter subtests** (using temp directories)

**Expected speedup**: 2-3x for integration tests

### Short-term (Next Session - 1-2 hours)

1. **Create `UniqueTestName()` helper** in `tests/integration/helpers.go`
2. **Update remaining tests** to use unique resource names
3. **Add `t.Parallel()` to all isolated tests**
4. **Run with race detector** to verify no issues

**Expected speedup**: 4-6x for integration tests

### Long-term (Future Work - 1 day)

1. **Benchmark test execution** to find bottlenecks
2. **Optimize slow tests** (reduce timeouts, reduce test data)
3. **Consider test sharding** for CI/CD pipelines
4. **Add parallel test documentation** to test guidelines

**Expected speedup**: 8-10x for integration tests

## Summary

**Yes, Go has excellent parallel test support!** Main strategies:

1. ✅ **`t.Parallel()`** - Mark tests safe to run in parallel (biggest win)
2. ✅ **`-parallel N`** - Control how many tests run concurrently
3. ✅ **Package parallelism** - Already happening automatically
4. ✅ **Resource isolation** - Use unique names/directories per test
5. ✅ **Race detector** - Verify tests are safe with `go test -race`

**Expected speedup for Hermes**: 2-6x for integration tests with minimal effort.

---

**References**:
- [Go Testing Package](https://pkg.go.dev/testing)
- [Go Test Parallelism](https://go.dev/blog/subtests)
- [Testcontainers Best Practices](https://golang.testcontainers.org/)
