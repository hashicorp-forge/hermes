//go:build integration
// +build integration

// Package integration provides test fixtures for integration tests.
// This package manages Docker containers using testcontainers-go.
//
// The fixture uses a singleton pattern where containers are started once
// before any tests run (via init in each package's TestMain) and torn down
// after all tests complete.
package integration

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
)

// TestFixture manages Docker containers for integration tests.
type TestFixture struct {
	PostgresContainer    *postgres.PostgresContainer
	MeilisearchContainer testcontainers.Container
	PostgresURL          string
	MeilisearchHost      string
	MeilisearchAPIKey    string
}

var (
	// Global fixture instance (singleton pattern for test suite)
	globalFixture     *TestFixture
	globalFixtureLock sync.Mutex
	globalFixtureErr  error
	setupOnce         sync.Once
)

// SetupFixtureSuite creates and starts all required Docker containers for integration tests.
// This should be called once from TestMain before running any tests.
// It uses sync.Once to ensure containers are only started once even if called multiple times.
func SetupFixtureSuite() error {
	var err error
	setupOnce.Do(func() {
		err = setupFixtureImpl()
	})

	if err != nil {
		return err
	}

	if globalFixtureErr != nil {
		return globalFixtureErr
	}

	return nil
}

// setupFixtureImpl does the actual container setup work
func setupFixtureImpl() error {
	globalFixtureLock.Lock()
	defer globalFixtureLock.Unlock()

	// Create new fixture
	ctx := context.Background()
	fixture := &TestFixture{
		MeilisearchAPIKey: "masterKey123",
	}

	log.Println("🚀 Starting Docker containers for integration tests...")

	// Start PostgreSQL container
	log.Println("  📦 Starting PostgreSQL container...")
	pgContainer, err := postgres.Run(ctx,
		"postgres:17.1-alpine",
		postgres.WithDatabase("db"),
		postgres.WithUsername("postgres"),
		postgres.WithPassword("postgres"),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").
				WithOccurrence(2).
				WithStartupTimeout(60*time.Second),
		),
	)
	if err != nil {
		globalFixtureErr = fmt.Errorf("failed to start PostgreSQL container: %w", err)
		return globalFixtureErr
	}
	fixture.PostgresContainer = pgContainer

	// Get PostgreSQL connection string
	connStr, err := pgContainer.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		globalFixtureErr = fmt.Errorf("failed to get PostgreSQL connection string: %w", err)
		_ = pgContainer.Terminate(ctx)
		return globalFixtureErr
	}
	fixture.PostgresURL = connStr
	log.Printf("  ✓ PostgreSQL started: %s\n", connStr)

	// Start Meilisearch container
	log.Println("  📦 Starting Meilisearch container...")
	meilisearchContainer, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: testcontainers.ContainerRequest{
			Image:        "getmeili/meilisearch:v1.11",
			ExposedPorts: []string{"7700/tcp"},
			Env: map[string]string{
				"MEILI_ENV":          "development",
				"MEILI_MASTER_KEY":   fixture.MeilisearchAPIKey,
				"MEILI_NO_ANALYTICS": "true",
			},
			WaitingFor: wait.ForHTTP("/health").
				WithPort("7700/tcp").
				WithStartupTimeout(60 * time.Second).
				WithPollInterval(1 * time.Second),
		},
		Started: true,
	})
	if err != nil {
		// Clean up PostgreSQL if Meilisearch fails
		_ = pgContainer.Terminate(ctx)
		globalFixtureErr = fmt.Errorf("failed to start Meilisearch container: %w", err)
		return globalFixtureErr
	}
	fixture.MeilisearchContainer = meilisearchContainer

	// Get Meilisearch host
	host, err := meilisearchContainer.Host(ctx)
	if err != nil {
		_ = pgContainer.Terminate(ctx)
		_ = meilisearchContainer.Terminate(ctx)
		globalFixtureErr = fmt.Errorf("failed to get Meilisearch host: %w", err)
		return globalFixtureErr
	}

	mappedPort, err := meilisearchContainer.MappedPort(ctx, "7700")
	if err != nil {
		_ = pgContainer.Terminate(ctx)
		_ = meilisearchContainer.Terminate(ctx)
		globalFixtureErr = fmt.Errorf("failed to get Meilisearch port: %w", err)
		return globalFixtureErr
	}

	fixture.MeilisearchHost = fmt.Sprintf("http://%s:%s", host, mappedPort.Port())
	log.Printf("  ✓ Meilisearch started: %s\n", fixture.MeilisearchHost)

	// Store global fixture
	globalFixture = fixture
	globalFixtureErr = nil

	log.Println("✅ All containers started successfully")
	return nil
}

// TeardownFixtureSuite stops and removes all Docker containers.
// This should be called once from TestMain after all tests complete.
func TeardownFixtureSuite() {
	globalFixtureLock.Lock()
	defer globalFixtureLock.Unlock()

	if globalFixture == nil {
		return
	}

	log.Println("🧹 Stopping Docker containers...")
	ctx := context.Background()

	// Stop Meilisearch
	if globalFixture.MeilisearchContainer != nil {
		if err := globalFixture.MeilisearchContainer.Terminate(ctx); err != nil {
			log.Printf("  ⚠️  Warning: failed to terminate Meilisearch container: %v\n", err)
		} else {
			log.Println("  ✓ Meilisearch container stopped")
		}
	}

	// Stop PostgreSQL
	if globalFixture.PostgresContainer != nil {
		if err := globalFixture.PostgresContainer.Terminate(ctx); err != nil {
			log.Printf("  ⚠️  Warning: failed to terminate PostgreSQL container: %v\n", err)
		} else {
			log.Println("  ✓ PostgreSQL container stopped")
		}
	}

	globalFixture = nil
	globalFixtureErr = nil
	log.Println("✅ All containers stopped")
}

// GetFixture returns the global test fixture.
// Panics if fixture is not initialized - ensure SetupFixtureSuite was called from TestMain.
func GetFixture() *TestFixture {
	globalFixtureLock.Lock()
	defer globalFixtureLock.Unlock()

	if globalFixture == nil {
		panic("fixture not initialized - ensure SetupFixtureSuite was called from TestMain")
	}
	return globalFixture
}

// GetPostgresURL returns the PostgreSQL connection URL from the global fixture.
// Panics if fixture is not initialized.
func GetPostgresURL() string {
	return GetFixture().PostgresURL
}

// GetMeilisearchConfig returns the Meilisearch host and API key from the global fixture.
// Panics if fixture is not initialized.
func GetMeilisearchConfig() (host string, apiKey string) {
	fixture := GetFixture()
	return fixture.MeilisearchHost, fixture.MeilisearchAPIKey
}
