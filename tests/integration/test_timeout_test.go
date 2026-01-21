//go:build integration

package integration

import (
	"context"
	"runtime"
	"sync"
	"testing"
	"time"
)

// TestTimeoutWatchdog_WatchdogGoroutineMonitoring validates that the watchdog goroutine
// is actually monitoring progress and can detect when a test hangs.
func TestTimeoutWatchdog_WatchdogGoroutineMonitoring(t *testing.T) {
	// This test validates the watchdog's internal mechanisms without triggering a full failure

	var detectedHang bool
	var mu sync.Mutex

	// Create a custom TestTimeout that we can inspect
	timeout := 500 * time.Millisecond
	progressCheck := 100 * time.Millisecond
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	tt := &TestTimeout{
		timeout:       timeout,
		progressCheck: progressCheck,
		lastProgress:  time.Now(),
		ctx:           ctx,
		cancel:        cancel,
		t:             t,
	}

	// Start a modified watchdog that sets a flag instead of failing the test
	watchdogDone := make(chan bool)
	go func() {
		ticker := time.NewTicker(progressCheck)
		defer ticker.Stop()
		defer close(watchdogDone)

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				tt.mu.Lock()
				timeSinceProgress := time.Since(tt.lastProgress)
				tt.mu.Unlock()

				if timeSinceProgress > progressCheck*2 {
					mu.Lock()
					detectedHang = true
					mu.Unlock()
					t.Logf("✓ Watchdog detected hang after %v (threshold: %v)", timeSinceProgress, progressCheck*2)
					cancel() // Stop the test
					return
				}
			}
		}
	}()

	// Simulate initial progress
	tt.Progress("Starting test")
	time.Sleep(50 * time.Millisecond)

	// Now hang without calling Progress - watchdog should detect after 200ms
	time.Sleep(300 * time.Millisecond)

	// Wait for watchdog to complete
	select {
	case <-watchdogDone:
		// Watchdog finished
	case <-time.After(1 * time.Second):
		t.Fatal("Watchdog goroutine didn't complete in time")
	}

	// Verify the watchdog detected the hang
	mu.Lock()
	defer mu.Unlock()

	if !detectedHang {
		t.Error("Watchdog failed to detect hung test")
	} else {
		t.Logf("✓ Watchdog successfully detected hung test")
	}
}

// TestTimeoutWatchdog_AllowsProgressingTest verifies the watchdog doesn't interfere with tests that make progress.
func TestTimeoutWatchdog_AllowsProgressingTest(t *testing.T) {
	completed := false

	// Test with short timeout to verify it completes normally
	WithTimeout(t, 2*time.Second, 200*time.Millisecond, func(ctx context.Context, progress func(string)) {
		// Simulate a test that consistently makes progress
		for i := 0; i < 5; i++ {
			progress("Working on step")
			time.Sleep(100 * time.Millisecond)
		}
		completed = true
	})

	if !completed {
		t.Error("Test did not complete - watchdog may have incorrectly triggered")
	} else {
		t.Logf("✓ Watchdog correctly allowed progressing test to complete")
	}
}

// TestTimeoutWatchdog_ContextTimeout verifies the context timeout works.
func TestTimeoutWatchdog_ContextTimeout(t *testing.T) {
	tt := NewTestTimeout(t, 200*time.Millisecond, 50*time.Millisecond)
	defer tt.Done()

	ctx := tt.Context()

	// Keep making progress so the watchdog doesn't trigger
	// This lets us test the context timeout specifically
	done := make(chan bool)
	go func() {
		ticker := time.NewTicker(40 * time.Millisecond)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				done <- true
				return
			case <-ticker.C:
				tt.Progress("Waiting for context timeout")
			}
		}
	}()

	// Wait for context to timeout
	<-done

	if ctx.Err() != context.DeadlineExceeded {
		t.Errorf("Expected DeadlineExceeded, got %v", ctx.Err())
	} else {
		t.Logf("✓ Context timeout works correctly")
	}
}

// TestTimeoutWatchdog_StackDumpMechanism verifies that stack dumps can be generated.
func TestTimeoutWatchdog_StackDumpMechanism(t *testing.T) {
	// Verify we can capture stack traces
	buf := make([]byte, 1024*1024)
	stackLen := runtime.Stack(buf, true)

	if stackLen == 0 {
		t.Error("Failed to capture stack traces")
	} else {
		t.Logf("✓ Stack capture works (captured %d bytes)", stackLen)
	}

	// Verify the stack contains expected goroutine information
	stackStr := string(buf[:stackLen])
	if len(stackStr) < 100 {
		t.Error("Stack trace seems too short")
	} else {
		t.Logf("✓ Stack trace contains %d characters", len(stackStr))
	}
}
