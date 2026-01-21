# Performance Optimization Guide

## Problem: Tests Are Slow

The original integration tests take ~60 seconds each because each test:
1. Creates a fresh PostgreSQL database
2. Runs migrations
3. Seeds data
4. Executes test
5. Drops database

**Result**: 7 tests = ~7 minutes of runtime

## Solution: Optimize with Transactions

### ✅ Fast Approach: Shared Suite + Transactions

```go
func TestFast_DatabaseOperations(t *testing.T) {
    suite := NewSuite(t)  // 60s - done ONCE
    defer suite.Cleanup()

    t.Run("CreateDocument", func(t *testing.T) {
        tx := suite.DB.Begin()
        defer tx.Rollback()  // Automatic cleanup

        doc := fixtures.NewDocument().
            WithGoogleFileID("fast-test-1").
            Create(t, tx)  // Uses transaction

        assert.NotZero(t, doc.ID)
    }) // Runtime: ~0.01s
}
```

**Performance**: Each subtest runs in **10-50ms** instead of 60 seconds!

## Optimization Strategies

### 1. Transaction-Based Isolation

**Use For**: Database tests that don't need search
**Speed**: ⚡⚡⚡ ~10-50ms per test
**Setup**: Minimal

```go
t.Run("MyTest", func(t *testing.T) {
    tx := suite.DB.Begin()
    defer tx.Rollback()
    
    // All operations use tx instead of suite.DB
    doc := fixtures.NewDocument().Create(t, tx)
    
    // Changes auto-rollback, no cleanup needed!
})
```

### 2. Batch Operations

**Use For**: Indexing multiple documents
**Speed**: ⚡⚡ 5-10x faster than individual operations

```go
// Slow: Individual Index() calls
for _, doc := range docs {
    suite.SearchProvider.DocumentIndex().Index(ctx, doc)
}

// Fast: Batch operation
suite.SearchProvider.DocumentIndex().IndexBatch(ctx, docs)
```

### 3. Mock Search Provider

**Use For**: Tests that don't need real search
**Speed**: ⚡⚡⚡ Instant (no network)

```go
suite := NewSuite(t, WithMockSearch())
// Search operations are instant
```

### 4. Parallel Test Execution

**Use For**: Independent tests with transaction isolation
**Speed**: ⚡⚡ Runs multiple tests simultaneously

```go
t.Run("group", func(t *testing.T) {
    t.Run("test1", func(t *testing.T) {
        t.Parallel()
        tx := suite.DB.Begin()
        defer tx.Rollback()
        // test code
    })
    
    t.Run("test2", func(t *testing.T) {
        t.Parallel()
        tx := suite.DB.Begin()
        defer tx.Rollback()
        // test code
    })
})
```

## Performance Comparison

| Approach | Setup Time | Per Test | Total (7 tests) |
|----------|-----------|----------|-----------------|
| **Original** (new suite per test) | 60s × 7 | 60s | ~7 minutes |
| **Shared suite + tx** | 60s × 1 | 0.01s | ~70 seconds |
| **Parallel + tx** | 60s × 1 | 0.01s | ~60 seconds |
| **Mock search + tx** | 5s × 1 | 0.01s | ~10 seconds |

## Best Practices

### ✅ DO: Use Transactions for Isolation

```go
// Good: Fast and isolated
t.Run("Test", func(t *testing.T) {
    tx := suite.DB.Begin()
    defer tx.Rollback()
    
    doc := fixtures.NewDocument().Create(t, tx)
    // Test with doc
})
```

### ❌ DON'T: Create New Suite Per Test

```go
// Bad: 60 second overhead per test
func TestSomething(t *testing.T) {
    suite := NewSuite(t)  // SLOW!
    defer suite.Cleanup()
    // test code
}
```

### ✅ DO: Group Related Tests

```go
// Good: Share suite setup cost
func TestDocumentOperations(t *testing.T) {
    suite := NewSuite(t)  // 60s - once
    defer suite.Cleanup()

    t.Run("Create", func(t *testing.T) { /* 0.01s */ })
    t.Run("Update", func(t *testing.T) { /* 0.01s */ })
    t.Run("Delete", func(t *testing.T) { /* 0.01s */ })
}
```

### ✅ DO: Use Batch Operations

```go
// Good: Single network call
searchDocs := make([]*search.Document, len(docs))
for i, doc := range docs {
    searchDocs[i] = ModelToSearchDocument(doc)
}
suite.SearchProvider.DocumentIndex().IndexBatch(ctx, searchDocs)

// Bad: Multiple network calls
for _, doc := range docs {
    searchDoc := ModelToSearchDocument(doc)
    suite.SearchProvider.DocumentIndex().Index(ctx, searchDoc)
}
```

## Running Optimized Tests

```bash
# Run all optimized tests
go test -v -run TestFast

# Run with mock search (fastest)
go test -v -run TestWithMockSearch

# Run parallel tests
go test -v -run TestParallel -parallel 4

# Run performance comparison
go test -v -run TestPerformanceComparison
```

## Migration Guide

### From: Slow Tests
```go
func TestOldWay(t *testing.T) {
    suite := NewSuite(t)
    defer suite.Cleanup()
    
    doc := fixtures.NewDocument().Create(t, suite.DB)
    assert.NotZero(t, doc.ID)
}
```

### To: Fast Tests
```go
func TestNewWay(t *testing.T) {
    suite := NewSuite(t)
    defer suite.Cleanup()
    
    t.Run("MyTest", func(t *testing.T) {
        tx := suite.DB.Begin()
        defer tx.Rollback()
        
        doc := fixtures.NewDocument().Create(t, tx)
        assert.NotZero(t, doc.ID)
    })
}
```

**Savings**: 60 seconds per test!

## When to Use Each Approach

| Approach | When to Use | Speed | Isolation |
|----------|-------------|-------|-----------|
| **New Suite** | Acceptance tests, integration tests needing fresh state | Slow (60s) | Perfect |
| **Shared Suite + Tx** | Unit tests, most integration tests | Fast (0.01s) | Perfect |
| **Mock Search** | Tests not requiring real search | Fastest | Perfect |
| **Parallel** | Many independent tests | Fast | Perfect |

## Real-World Example

See `optimized_test.go` for complete examples:
- `TestFast_DatabaseOperations` - Transaction-based tests
- `TestOptimized_SearchBatch` - Batch indexing
- `TestWithMockSearch` - Mock search provider
- `TestParallel_DatabaseOperations` - Parallel execution
- `TestPerformanceComparison` - Before/after comparison

## Future Optimizations

1. **Database Pooling**: Reuse databases across test runs
2. **Test Data Fixtures**: Pre-populated databases
3. **Smart Cleanup**: Only clean what changed
4. **Caching**: Cache compiled migrations
5. **Connection Pooling**: Reuse database connections

## Summary

- ⚡ Use transactions for 100x speedup
- 🚀 Use batch operations for search
- 🎭 Use mocks when appropriate
- 🔀 Use parallel execution
- 📦 Group related tests

**Result**: Tests run in **milliseconds** instead of **minutes**!
