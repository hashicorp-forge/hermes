//go:build integration
// +build integration

// Package search contains integration tests for search adapters.
package search

import (
	"fmt"
	"os"
	"testing"

	"github.com/hashicorp-forge/hermes/tests/integration"
) // TestMain is the entry point for the test suite.
// It sets up the test fixture before any tests run.
func TestMain(m *testing.M) {
	// Setup fixture suite (starts containers once for all tests)
	if err := integration.SetupFixtureSuite(); err != nil {
		fmt.Fprintf(os.Stderr, "❌ Failed to setup fixture suite: %v\n", err)
		os.Exit(1)
	}

	// Run tests
	code := m.Run()

	// Teardown fixture suite (stops containers)
	integration.TeardownFixtureSuite()

	// Exit with test result code
	os.Exit(code)
}
