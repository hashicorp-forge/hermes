//go:build integration
// +build integration

package api

import (
	"context"
	"fmt"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/hashicorp-forge/hermes/internal/test"
	"github.com/hashicorp-forge/hermes/pkg/models"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
	"gorm.io/gorm"
)

// SharedTestContainers holds the shared Docker containers for all API tests.
type SharedTestContainers struct {
	PostgresContainer    *postgres.PostgresContainer
	MeilisearchContainer testcontainers.Container
	PostgresDSN          string
	MeilisearchHost      string
	MeilisearchAPIKey    string
	ctx                  context.Context
}

var (
	sharedContainers     *SharedTestContainers
	sharedContainersLock sync.Mutex
	setupOnce            sync.Once
	setupErr             error
)

// TestMain is the entry point for the API integration test suite.
// It starts containers once before all tests and tears them down after.
func TestMain(m *testing.M) {
	// Setup: Start containers once for all tests
	if err := setupSharedContainers(); err != nil {
		fmt.Fprintf(os.Stderr, "❌ Failed to setup shared containers: %v\n", err)
		os.Exit(1)
	}

	// Run all tests
	code := m.Run()

	// Teardown: Stop containers
	teardownSharedContainers()

	// Exit with test result code
	os.Exit(code)
}

// setupSharedContainers starts PostgreSQL and Meilisearch once for all tests.
func setupSharedContainers() error {
	setupOnce.Do(func() {
		setupErr = setupSharedContainersImpl()
	})
	return setupErr
}

// setupSharedContainersImpl does the actual container setup.
func setupSharedContainersImpl() error {
	sharedContainersLock.Lock()
	defer sharedContainersLock.Unlock()

	ctx := context.Background()
	fmt.Println("🚀 Starting shared Docker containers for API integration tests...")

	// Start PostgreSQL container
	fmt.Println("  📦 Starting PostgreSQL container...")
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
	if err != nil {
		return fmt.Errorf("failed to start PostgreSQL container: %w", err)
	}

	// Get PostgreSQL connection string
	postgresDSN, err := postgresContainer.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		_ = postgresContainer.Terminate(ctx)
		return fmt.Errorf("failed to get PostgreSQL connection string: %w", err)
	}
	fmt.Printf("  ✓ PostgreSQL started: %s\n", postgresDSN)

	// Start Meilisearch container
	fmt.Println("  📦 Starting Meilisearch container...")
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
	if err != nil {
		_ = postgresContainer.Terminate(ctx)
		return fmt.Errorf("failed to start Meilisearch container: %w", err)
	}

	// Get Meilisearch host
	meilisearchHost, err := meilisearchContainer.Host(ctx)
	if err != nil {
		_ = postgresContainer.Terminate(ctx)
		_ = meilisearchContainer.Terminate(ctx)
		return fmt.Errorf("failed to get Meilisearch host: %w", err)
	}

	meilisearchPort, err := meilisearchContainer.MappedPort(ctx, "7700")
	if err != nil {
		_ = postgresContainer.Terminate(ctx)
		_ = meilisearchContainer.Terminate(ctx)
		return fmt.Errorf("failed to get Meilisearch port: %w", err)
	}

	meilisearchURL := fmt.Sprintf("http://%s:%s", meilisearchHost, meilisearchPort.Port())
	fmt.Printf("  ✓ Meilisearch started: %s\n", meilisearchURL)

	sharedContainers = &SharedTestContainers{
		PostgresContainer:    postgresContainer,
		MeilisearchContainer: meilisearchContainer,
		PostgresDSN:          postgresDSN,
		MeilisearchHost:      meilisearchURL,
		MeilisearchAPIKey:    "masterKey123",
		ctx:                  ctx,
	}

	fmt.Println("✅ All shared containers started successfully")
	return nil
}

// teardownSharedContainers stops all containers.
func teardownSharedContainers() {
	sharedContainersLock.Lock()
	defer sharedContainersLock.Unlock()

	if sharedContainers == nil {
		return
	}

	fmt.Println("🧹 Stopping shared Docker containers...")
	ctx := sharedContainers.ctx

	if sharedContainers.MeilisearchContainer != nil {
		if err := sharedContainers.MeilisearchContainer.Terminate(ctx); err != nil {
			fmt.Printf("  ⚠️  Warning: failed to terminate Meilisearch: %v\n", err)
		} else {
			fmt.Println("  ✓ Meilisearch container stopped")
		}
	}

	if sharedContainers.PostgresContainer != nil {
		if err := sharedContainers.PostgresContainer.Terminate(ctx); err != nil {
			fmt.Printf("  ⚠️  Warning: failed to terminate PostgreSQL: %v\n", err)
		} else {
			fmt.Println("  ✓ PostgreSQL container stopped")
		}
	}

	sharedContainers = nil
	fmt.Println("✅ All shared containers stopped")
}

// GetSharedContainers returns the shared containers for use in tests.
// Panics if containers are not initialized.
func GetSharedContainers() *SharedTestContainers {
	sharedContainersLock.Lock()
	defer sharedContainersLock.Unlock()

	if sharedContainers == nil {
		panic("shared containers not initialized - ensure TestMain was called")
	}

	return sharedContainers
}

// CreateTestDatabaseForTest creates a new database schema for a single test.
// This provides isolation between tests while sharing the same PostgreSQL container.
// Each test gets its own schema, so they can run in parallel without conflicts.
func CreateTestDatabaseForTest(t *testing.T) (*gorm.DB, string) {
	containers := GetSharedContainers()

	// Create unique schema name for this test
	schemaName := fmt.Sprintf("test_%d", time.Now().UnixNano())

	// Connect to the shared database
	db, err := test.CreateTestDatabaseWithDSN(t, containers.PostgresDSN)
	require.NoError(t, err, "Failed to create test database connection")

	// Create schema for this test
	err = db.Exec(fmt.Sprintf("CREATE SCHEMA IF NOT EXISTS %s", schemaName)).Error
	require.NoError(t, err, "Failed to create test schema")

	// Set search path to use this test's schema
	err = db.Exec(fmt.Sprintf("SET search_path TO %s,public", schemaName)).Error
	require.NoError(t, err, "Failed to set search path")

	// Auto-migrate models in this schema
	err = db.AutoMigrate(models.ModelsToAutoMigrate()...)
	require.NoError(t, err, "Failed to auto-migrate models")

	// Register cleanup to drop schema after test
	t.Cleanup(func() {
		// Drop schema and all objects in it
		_ = db.Exec(fmt.Sprintf("DROP SCHEMA IF EXISTS %s CASCADE", schemaName)).Error
	})

	return db, schemaName
}
