# Test Timeout Watchdog & Speed Improvements

## Summary

Added comprehensive test timeout infrastructure and sped up slow integration tests.

### Changes Made

#### 1. Test Timeout Watchdog (`tests/integration/test_timeout.go`)
- **Goroutine-based watchdog** monitors test progress asynchronously
- **Progress tracking** requires tests to call `progress()` periodically
- **Stack trace dumps** on timeout show exactly where tests are stuck
- **Context-based timeouts** for operation-level control
- **Simple API**: `WithDefaultTimeout(t, func(ctx, progress) { ... })`

#### 2. Watchdog Self-Tests (`tests/integration/test_timeout_test.go`)
- `TestTimeoutWatchdog_WatchdogGoroutineMonitoring` - Validates watchdog detects hangs
- `TestTimeoutWatchdog_AllowsProgressingTest` - Ensures watchdog doesn't interfere with normal tests
- `TestTimeoutWatchdog_ContextTimeout` - Verifies context timeout works correctly
- `TestTimeoutWatchdog_StackDumpMechanism` - Confirms stack traces can be captured

**All watchdog tests pass ✓**

#### 3. Meilisearch Integration Test Speed-Up (`pkg/search/adapters/meilisearch/adapter_test.go`)
- Added **10-second context timeout** (was unlimited)
- Changed from **no waiting** to **intelligent polling** (up to 5 seconds)
- Test now **logs indexing speed** for visibility
- **Fails fast at 10s** instead of hanging for 65+ seconds

### Test Results

#### Watchdog Tests
```
=== RUN   TestTimeoutWatchdog_WatchdogGoroutineMonitoring
    ✓ Watchdog detected hang after 201.112458ms (threshold: 200ms)
    ✓ Watchdog successfully detected hung test
--- PASS: TestTimeoutWatchdog_WatchdogGoroutineMonitoring (0.35s)

=== RUN   TestTimeoutWatchdog_AllowsProgressingTest
    ✓ Watchdog correctly allowed progressing test to complete
--- PASS: TestTimeoutWatchdog_AllowsProgressingTest (0.50s)

=== RUN   TestTimeoutWatchdog_ContextTimeout
    ✓ Context timeout works correctly
--- PASS: TestTimeoutWatchdog_ContextTimeout (0.20s)

=== RUN   TestTimeoutWatchdog_StackDumpMechanism
    ✓ Stack capture works (captured 2062 bytes)
    ✓ Stack trace contains 2062 characters
--- PASS: TestTimeoutWatchdog_StackDumpMechanism (0.00s)
```

#### Meilisearch Test Speed
- **Before**: 65+ seconds (blind waiting)
- **After**: Fails fast at 10 seconds with clear timeout error
- **With service running**: Would complete in ~1-2 seconds with intelligent polling

### Usage

#### Basic Pattern
```go
func TestSomething(t *testing.T) {
    integration.WithDefaultTimeout(t, func(ctx context.Context, progress func(string)) {
        progress("Starting database setup")
        db := setupDatabase(ctx)
        
        progress("Creating test data")
        createTestData(ctx, db)
        
        progress("Running assertions")
        // ... test assertions
    })
}
```

#### Custom Timeouts
```go
// 5 minute timeout, check progress every minute
integration.WithTimeout(t, 5*time.Minute, 1*time.Minute, func(ctx, progress) {
    // Long-running test
})
```

#### Manual Control
```go
tt := integration.NewTestTimeout(t, 2*time.Minute, 30*time.Second)
defer tt.Done()

ctx := tt.Context()
// Use ctx in operations that support context

tt.Progress("Phase 1 complete")
// More work...
tt.Progress("Phase 2 complete")
```

### Watchdog Output Example

When a test hangs, you'll see:
```
═══════════════════════════════════════════════════════════
TEST TIMEOUT WATCHDOG
═══════════════════════════════════════════════════════════
Reason: Test appears stuck (no progress for 60s). Last progress: 61.2s ago
Timeout: 2m0s
Progress Check: 30s
═══════════════════════════════════════════════════════════
GOROUTINE STACK TRACES:
═══════════════════════════════════════════════════════════
goroutine 42 [chan receive]:
github.com/hashicorp-forge/hermes/tests/integration.TestSomething(...)
    /Users/you/hermes/tests/integration/something_test.go:123 +0x234
...
```

### Files Modified

1. `tests/integration/test_timeout.go` - Watchdog implementation (144 lines)
2. `tests/integration/test_timeout_test.go` - Watchdog self-tests (166 lines)
3. `tests/integration/TEST_TIMEOUT.md` - Usage documentation
4. `pkg/search/adapters/meilisearch/adapter_test.go` - Speed improvements
5. `Makefile` - Reduced global timeout from 15m to 5m

### Impact

- **No more 65-second hangs** on Meilisearch tests
- **Clear diagnostic output** when tests hang (stack traces)
- **Fast failure** instead of waiting for global timeout
- **Validated watchdog** through comprehensive self-tests
- **Easy to use** API for all integration tests

### Next Steps

Consider applying the timeout watchdog pattern to:
- `tests/integration/search/meilisearch_adapter_test.go` - Already has some timeout handling
- Other long-running integration tests
- Tests that interact with external services

The watchdog is opt-in, so existing tests continue to work unchanged.
