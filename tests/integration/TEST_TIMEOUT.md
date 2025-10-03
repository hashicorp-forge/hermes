# Test Timeout Watchdog

## Problem

Integration tests that interact with external services (like Meilisearch, PostgreSQL) can sometimes hang indefinitely if:
- The service is slow to respond
- Network issues occur
- Deadlocks happen in test code
- Async operations don't complete

This makes CI/CD unreliable and wastes developer time.

## Solution

The `test_timeout.go` module provides a watchdog that:
1. **Sets hard timeouts** for tests (default: 2 minutes)
2. **Monitors progress** - tests must report progress periodically
3. **Dumps stack traces** when tests hang, showing exactly where they're stuck
4. **Fails fast** instead of waiting for the global timeout

## Usage

### Simple Wrapper (Recommended)

```go
func TestSomething(t *testing.T) {
    integration.WithDefaultTimeout(t, func(ctx context.Context, progress func(string)) {
        progress("Starting test")
        
        // Your test code here
        // Use ctx for operations that support context
        results, err := service.Query(ctx, query)
        progress("Query completed")
        
        // More test code
        progress("Verifying results")
        assert.NoError(t, err)
    })
}
```

### Custom Timeouts

```go
func TestLongRunning(t *testing.T) {
    // 5 minute timeout, check progress every minute
    integration.WithTimeout(t, 5*time.Minute, 1*time.Minute, 
        func(ctx context.Context, progress func(string)) {
            progress("Phase 1: Setup")
            // ... setup code ...
            
            progress("Phase 2: Heavy computation")
            // ... long running code ...
            
            progress("Phase 3: Cleanup")
            // ... cleanup code ...
        })
}
```

### Manual Control

```go
func TestManual(t *testing.T) {
    tt := integration.NewTestTimeout(t, 2*time.Minute, 30*time.Second)
    defer tt.Done()
    
    ctx := tt.Context()
    
    // Phase 1
    tt.Progress("Starting phase 1")
    doPhase1(ctx)
    
    // Phase 2  
    tt.Progress("Starting phase 2")
    doPhase2(ctx)
}
```

## Current Implementation

### Makefile Changes
- Reduced global timeout from 15m to 5m per package
- Added verbose output (`-v`) to see test progress
- Tests now show which phase they're in

### Test Updates
- `TestMeilisearchAdapter_BasicUsage`: Added 2-minute timeout + progress logging
- `TestMeilisearchAdapter_EdgeCases`: Added 2-minute timeout
- Both tests now wait intelligently for Meilisearch indexing (up to 30s) instead of blind sleep

### Indexing Wait Logic
Instead of:
```go
time.Sleep(500 * time.Millisecond)  // Hope it's ready
```

Now:
```go
// Poll until ready or timeout
for i := 0; i < 60; i++ {
    time.Sleep(500 * time.Millisecond)
    if indexIsReady() {
        break
    }
}
```

## When Tests Timeout

You'll see output like:
```
═══════════════════════════════════════════════════════════
TEST TIMEOUT WATCHDOG
═══════════════════════════════════════════════════════════
Reason: Test appears stuck (no progress for 1m0s). Last progress: 1m5s ago
Timeout: 2m0s
Progress Check: 30s
═══════════════════════════════════════════════════════════
GOROUTINE STACK TRACES:
═══════════════════════════════════════════════════════════
goroutine 1 [chan receive]:
testing.(*T).Run(0xc0001a8000, {0x1234567, 0x8}, 0xabcdef)
    /usr/local/go/src/testing/testing.go:1234 +0x123
...
```

This shows:
- Why it timed out
- How long since last progress
- Full stack traces of all goroutines
- Exactly where code is stuck

## Best Practices

1. **Call `progress()` frequently** - after each major step
2. **Use descriptive messages** - "Indexed 1000 documents" not just "Done"
3. **Pass context through** - use the provided `ctx` for cancelable operations
4. **Don't nest timeouts** - one per test function is enough
5. **Test the timeout** - temporarily remove progress calls to verify it works

## Future Improvements

- [ ] Add metrics (how long each phase takes)
- [ ] Automatic progress detection (track function calls)
- [ ] Per-operation timeouts (not just test-level)
- [ ] Integration with test retry logic
- [ ] Prometheus/statsd metrics for CI

## Troubleshooting

**Q: Test times out even though it's making progress**
A: Increase the progress check interval or call `progress()` more frequently

**Q: Stack trace doesn't show my code**
A: The test might be blocked in a library. Look for channel operations, mutexes, or I/O

**Q: Want different timeouts for different subtests**
A: Currently not supported - use multiple test functions instead
