//go:build integration
// +build integration

package api

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/hashicorp-forge/hermes/pkg/search/adapters/meilisearch"
	mock "github.com/hashicorp-forge/hermes/pkg/workspace/adapters/mock"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
)

// TestContainersContext is DEPRECATED - use GetSharedContainers() instead.
// This type is kept for backwards compatibility but containers field in IntegrationSuite is now nil.
//
// Deprecated: Containers are now managed by TestMain and shared across all tests.
// Use GetSharedContainers() if you need direct access to container information.
type TestContainersContext struct {
	PostgresContainer    *postgres.PostgresContainer
	MeilisearchContainer testcontainers.Container
	PostgresDSN          string
	MeilisearchHost      string
	ctx                  context.Context
}

// SetupTestContainers is DEPRECATED - containers are now started once in TestMain.
// This function is no longer needed and will be removed in a future version.
//
// Deprecated: Use NewIntegrationSuite() which automatically uses shared containers.
func SetupTestContainers(t *testing.T) *TestContainersContext {
	panic("SetupTestContainers is deprecated - containers are now managed by TestMain. Use NewIntegrationSuite() instead.")
}

// Cleanup is DEPRECATED - containers are cleaned up by TestMain, not per-test.
//
// Deprecated: No longer needed as containers are shared and cleaned up by TestMain.
func (tc *TestContainersContext) Cleanup(t *testing.T) {
	// No-op: containers are managed by TestMain
}

// IntegrationSuite wraps Suite with testcontainers for integration testing.
type IntegrationSuite struct {
	*Suite
	Containers *TestContainersContext
}

// NewIntegrationSuite creates a new integration test suite using shared containers.
// This is much faster than SetupTestContainers because containers are started once
// in TestMain and reused across all tests. Each test gets its own PostgreSQL schema
// for isolation, so tests can run safely in parallel.
func NewIntegrationSuite(t *testing.T, opts ...Option) *IntegrationSuite {
	// Get shared containers (started once in TestMain)
	containers := GetSharedContainers()

	// Create database connection with isolated schema for this test
	db, schemaName := CreateTestDatabaseForTest(t)

	// Note: Auto-migration is handled by CreateTestDatabaseForTest

	// Create Meilisearch adapter using shared container
	searchAdapter, err := meilisearch.NewAdapter(&meilisearch.Config{
		Host:            containers.MeilisearchHost,
		APIKey:          containers.MeilisearchAPIKey,
		DocsIndexName:   fmt.Sprintf("test-docs-%d", time.Now().UnixNano()),
		DraftsIndexName: fmt.Sprintf("test-drafts-%d", time.Now().UnixNano()),
	})
	require.NoError(t, err, "Failed to create Meilisearch adapter")

	// Wait for Meilisearch to be healthy
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	err = searchAdapter.Healthy(ctx)
	require.NoError(t, err, "Meilisearch is not healthy")

	suite := &Suite{
		T:              t,
		DB:             db,
		DBName:         schemaName, // Use schema name for clarity
		SearchProvider: searchAdapter,
		Ctx:            context.Background(),
		cleanupFuncs:   make([]func(), 0),
	}

	// Create mock workspace provider
	suite.WorkspaceProvider = mock.NewAdapter()

	// Create test configuration
	suite.Config = suite.createTestConfig()

	// Seed database
	err = suite.seedDatabase(db)
	require.NoError(t, err, "Failed to seed database")

	// Apply options
	for _, opt := range opts {
		if err := opt(suite); err != nil {
			t.Fatalf("Failed to apply option: %v", err)
		}
	}

	// Setup server
	err = suite.setupServer()
	require.NoError(t, err, "Failed to setup server")

	// Create client
	suite.Client = NewClient(suite.Server.URL, t)

	return &IntegrationSuite{
		Suite: suite,
		// Note: Containers field is deprecated - we use shared containers now
		Containers: nil,
	}
}

// Cleanup tears down the integration suite but NOT the containers.
// Containers are managed by TestMain and shared across all tests.
func (is *IntegrationSuite) Cleanup() {
	is.Suite.Cleanup()
	// Don't cleanup containers - they're shared and managed by TestMain
}
