//go:build integration
// +build integration

package integration

import (
	"os"
	"testing"
)

// TestMain is the entry point for integration tests.
// It starts containers before tests and tears them down after.
func TestMain(m *testing.M) {
	// Setup: Start containers
	if err := SetupFixtureSuite(); err != nil {
		println("❌ Failed to setup integration test fixture:", err.Error())
		os.Exit(1)
	}

	// Run tests
	code := m.Run()

	// Teardown: Stop containers
	TeardownFixtureSuite()

	// Exit with test result code
	os.Exit(code)
}
