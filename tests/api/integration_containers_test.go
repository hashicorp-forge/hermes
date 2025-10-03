//go:build integration
// +build integration

package api

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/hashicorp-forge/hermes/internal/test"
	"github.com/hashicorp-forge/hermes/pkg/models"
	"github.com/hashicorp-forge/hermes/pkg/search/adapters/meilisearch"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
)

// TestContainersContext holds the testcontainers infrastructure for integration tests.
type TestContainersContext struct {
	PostgresContainer    *postgres.PostgresContainer
	MeilisearchContainer testcontainers.Container
	PostgresDSN          string
	MeilisearchHost      string
	ctx                  context.Context
}

// SetupTestContainers starts PostgreSQL and Meilisearch using testcontainers.
func SetupTestContainers(t *testing.T) *TestContainersContext {
	ctx := context.Background()

	// Start PostgreSQL container
	postgresContainer, err := postgres.Run(ctx,
		"postgres:17.1-alpine",
		postgres.WithDatabase("hermes_test"),
		postgres.WithUsername("postgres"),
		postgres.WithPassword("postgres"),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").
				WithOccurrence(2).
				WithStartupTimeout(60*time.Second)),
	)
	require.NoError(t, err, "Failed to start PostgreSQL container")

	// Get PostgreSQL connection string
	postgresDSN, err := postgresContainer.ConnectionString(ctx, "sslmode=disable")
	require.NoError(t, err, "Failed to get PostgreSQL connection string")

	// Start Meilisearch container
	meilisearchReq := testcontainers.ContainerRequest{
		Image:        "getmeili/meilisearch:v1.10",
		ExposedPorts: []string{"7700/tcp"},
		Env: map[string]string{
			"MEILI_MASTER_KEY": "masterKey123",
			"MEILI_ENV":        "development",
		},
		WaitingFor: wait.ForHTTP("/health").
			WithPort("7700/tcp").
			WithStartupTimeout(60 * time.Second),
	}

	meilisearchContainer, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: meilisearchReq,
		Started:          true,
	})
	require.NoError(t, err, "Failed to start Meilisearch container")

	// Get Meilisearch host
	meilisearchHost, err := meilisearchContainer.Host(ctx)
	require.NoError(t, err, "Failed to get Meilisearch host")

	meilisearchPort, err := meilisearchContainer.MappedPort(ctx, "7700")
	require.NoError(t, err, "Failed to get Meilisearch port")

	meilisearchURL := fmt.Sprintf("http://%s:%s", meilisearchHost, meilisearchPort.Port())

	return &TestContainersContext{
		PostgresContainer:    postgresContainer,
		MeilisearchContainer: meilisearchContainer,
		PostgresDSN:          postgresDSN,
		MeilisearchHost:      meilisearchURL,
		ctx:                  ctx,
	}
}

// Cleanup terminates all containers.
func (tc *TestContainersContext) Cleanup(t *testing.T) {
	if tc.PostgresContainer != nil {
		if err := tc.PostgresContainer.Terminate(tc.ctx); err != nil {
			t.Logf("Failed to terminate PostgreSQL container: %v", err)
		}
	}
	if tc.MeilisearchContainer != nil {
		if err := tc.MeilisearchContainer.Terminate(tc.ctx); err != nil {
			t.Logf("Failed to terminate Meilisearch container: %v", err)
		}
	}
}

// IntegrationSuite wraps Suite with testcontainers for integration testing.
type IntegrationSuite struct {
	*Suite
	Containers *TestContainersContext
}

// NewIntegrationSuite creates a new integration test suite with testcontainers.
func NewIntegrationSuite(t *testing.T, opts ...Option) *IntegrationSuite {
	containers := SetupTestContainers(t)

	// Create database connection
	db, err := test.CreateTestDatabaseWithDSN(t, containers.PostgresDSN)
	require.NoError(t, err, "Failed to create test database")

	// Auto-migrate models
	err = db.AutoMigrate(models.ModelsToAutoMigrate()...)
	require.NoError(t, err, "Failed to auto-migrate models")

	// Create Meilisearch adapter
	searchAdapter, err := meilisearch.NewAdapter(&meilisearch.Config{
		Host:            containers.MeilisearchHost,
		APIKey:          "masterKey123",
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
		DBName:         "hermes_test",
		SearchProvider: searchAdapter,
		Ctx:            context.Background(),
		cleanupFuncs:   make([]func(), 0),
	}

	// Seed database
	err = suite.seedDatabase(db)
	require.NoError(t, err, "Failed to seed database")

	// Apply options
	for _, opt := range opts {
		if err := opt(suite); err != nil {
			containers.Cleanup(t)
			t.Fatalf("Failed to apply option: %v", err)
		}
	}

	// Setup server
	err = suite.setupServer()
	require.NoError(t, err, "Failed to setup server")

	// Create client
	suite.Client = NewClient(suite.Server.URL, t)

	return &IntegrationSuite{
		Suite:      suite,
		Containers: containers,
	}
}

// Cleanup tears down the integration suite and containers.
func (is *IntegrationSuite) Cleanup() {
	is.Suite.Cleanup()
	is.Containers.Cleanup(is.T)
}
