//go:build integration

package integration

import (
	"context"
	"fmt"
	"runtime"
	"sync"
	"testing"
	"time"
)

// TestTimeout provides a watchdog for tests that may hang.
// It ensures tests make progress or terminates them with a useful stack trace.
type TestTimeout struct {
	timeout       time.Duration
	progressCheck time.Duration
	lastProgress  time.Time
	mu            sync.Mutex
	ctx           context.Context
	cancel        context.CancelFunc
	t             *testing.T
}

// NewTestTimeout creates a new test timeout watchdog.
// timeout: maximum time the test can run
// progressCheck: how often to check if progress was made
func NewTestTimeout(t *testing.T, timeout, progressCheck time.Duration) *TestTimeout {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)

	tt := &TestTimeout{
		timeout:       timeout,
		progressCheck: progressCheck,
		lastProgress:  time.Now(),
		ctx:           ctx,
		cancel:        cancel,
		t:             t,
	}

	// Start watchdog
	go tt.watchdog()

	return tt
}

// Context returns the timeout context for use in test operations.
func (tt *TestTimeout) Context() context.Context {
	return tt.ctx
}

// Progress should be called periodically to indicate the test is making progress.
func (tt *TestTimeout) Progress(message string) {
	tt.mu.Lock()
	defer tt.mu.Unlock()

	tt.lastProgress = time.Now()
	if message != "" {
		tt.t.Logf("Progress: %s", message)
	}
}

// Done should be called when the test completes successfully.
func (tt *TestTimeout) Done() {
	tt.cancel()
}

// watchdog monitors test progress and terminates if stuck.
func (tt *TestTimeout) watchdog() {
	ticker := time.NewTicker(tt.progressCheck)
	defer ticker.Stop()

	for {
		select {
		case <-tt.ctx.Done():
			// Test completed or timed out
			return

		case <-ticker.C:
			tt.mu.Lock()
			timeSinceProgress := time.Since(tt.lastProgress)
			tt.mu.Unlock()

			if timeSinceProgress > tt.progressCheck*2 {
				// No progress for 2x check interval - dump stack and fail
				tt.dumpStackAndFail(fmt.Sprintf(
					"Test appears stuck (no progress for %v). Last progress: %v ago",
					tt.progressCheck*2,
					timeSinceProgress,
				))
				return
			}
		}
	}
}

// dumpStackAndFail dumps all goroutine stacks and fails the test.
func (tt *TestTimeout) dumpStackAndFail(reason string) {
	buf := make([]byte, 1024*1024) // 1MB buffer for stack traces
	stackLen := runtime.Stack(buf, true)

	tt.t.Errorf("\n"+
		"═══════════════════════════════════════════════════════════\n"+
		"TEST TIMEOUT WATCHDOG\n"+
		"═══════════════════════════════════════════════════════════\n"+
		"Reason: %s\n"+
		"Timeout: %v\n"+
		"Progress Check: %v\n"+
		"═══════════════════════════════════════════════════════════\n"+
		"GOROUTINE STACK TRACES:\n"+
		"═══════════════════════════════════════════════════════════\n"+
		"%s\n"+
		"═══════════════════════════════════════════════════════════\n",
		reason,
		tt.timeout,
		tt.progressCheck,
		string(buf[:stackLen]),
	)

	tt.cancel()
	tt.t.FailNow()
}

// WithTimeout is a helper that wraps a test with timeout protection.
// Usage:
//
//	integration.WithTimeout(t, 30*time.Second, 5*time.Second, func(ctx context.Context, progress func(string)) {
//	    // Your test code here
//	    progress("Created documents")
//	    // More test code
//	    progress("Searched documents")
//	})
func WithTimeout(t *testing.T, timeout, progressCheck time.Duration, testFunc func(ctx context.Context, progress func(string))) {
	tt := NewTestTimeout(t, timeout, progressCheck)
	defer tt.Done()

	testFunc(tt.Context(), tt.Progress)
}

// WithDefaultTimeout uses sensible defaults: 2 minute timeout, 30 second progress check.
func WithDefaultTimeout(t *testing.T, testFunc func(ctx context.Context, progress func(string))) {
	WithTimeout(t, 2*time.Minute, 30*time.Second, testFunc)
}
