//go:build integration
// +build integration

package integration

import (
	"context"
	"database/sql"
	"net/http"
	"testing"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Test_00_Canary is the first test that runs (due to naming) to verify containers are up.
// This acts as a canary test - if this fails, all other tests will likely fail too.
func Test_00_Canary(t *testing.T) {
	t.Log("🐦 Running canary test to verify containers are healthy...")

	fixture := GetFixture()

	require.NotNil(t, fixture, "Fixture should be initialized")

	t.Run("PostgreSQL", func(t *testing.T) {
		// Verify PostgreSQL container is running
		require.NotNil(t, fixture.PostgresContainer, "PostgreSQL container should exist")
		require.NotEmpty(t, fixture.PostgresURL, "PostgreSQL URL should be set")

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		// Check container state
		state, err := fixture.PostgresContainer.State(ctx)
		require.NoError(t, err, "Should be able to get PostgreSQL container state")
		assert.True(t, state.Running, "PostgreSQL container should be running")

		// Try to connect to PostgreSQL
		db, err := sql.Open("pgx", fixture.PostgresURL)
		require.NoError(t, err, "Should be able to open PostgreSQL connection")
		defer db.Close()

		err = db.PingContext(ctx)
		require.NoError(t, err, "Should be able to ping PostgreSQL")

		// Run a simple query
		var result int
		err = db.QueryRowContext(ctx, "SELECT 1").Scan(&result)
		require.NoError(t, err, "Should be able to run query")
		assert.Equal(t, 1, result, "Query should return 1")

		t.Logf("✅ PostgreSQL is healthy at: %s", fixture.PostgresURL)
	})

	t.Run("Meilisearch", func(t *testing.T) {
		// Verify Meilisearch container is running
		require.NotNil(t, fixture.MeilisearchContainer, "Meilisearch container should exist")
		require.NotEmpty(t, fixture.MeilisearchHost, "Meilisearch host should be set")
		require.NotEmpty(t, fixture.MeilisearchAPIKey, "Meilisearch API key should be set")

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		// Check container state
		state, err := fixture.MeilisearchContainer.State(ctx)
		require.NoError(t, err, "Should be able to get Meilisearch container state")
		assert.True(t, state.Running, "Meilisearch container should be running")

		// Try to connect to Meilisearch
		req, err := http.NewRequestWithContext(ctx, "GET", fixture.MeilisearchHost+"/health", nil)
		require.NoError(t, err, "Should be able to create request")

		resp, err := http.DefaultClient.Do(req)
		require.NoError(t, err, "Should be able to reach Meilisearch")
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode, "Meilisearch health check should return 200")

		t.Logf("✅ Meilisearch is healthy at: %s", fixture.MeilisearchHost)
	})

	t.Log("✅ Canary test passed - all containers are healthy and ready for testing")
}

// Test_GetFixture tests the GetFixture helper function.
func Test_GetFixture(t *testing.T) {
	fixture := GetFixture()
	assert.NotNil(t, fixture, "GetFixture should return non-nil fixture")
	assert.NotEmpty(t, fixture.PostgresURL, "PostgreSQL URL should be set")
	assert.NotEmpty(t, fixture.MeilisearchHost, "Meilisearch host should be set")
	assert.Equal(t, "masterKey123", fixture.MeilisearchAPIKey, "API key should match expected value")
}

// Test_GetHelpers tests the convenience helper functions.
func Test_GetHelpers(t *testing.T) {
	t.Run("GetPostgresURL", func(t *testing.T) {
		url := GetPostgresURL()
		assert.NotEmpty(t, url, "GetPostgresURL should return non-empty URL")
		assert.Contains(t, url, "postgres://", "URL should have postgres:// scheme")
	})

	t.Run("GetMeilisearchConfig", func(t *testing.T) {
		host, apiKey := GetMeilisearchConfig()
		assert.NotEmpty(t, host, "Host should not be empty")
		assert.Contains(t, host, "http://", "Host should have http:// scheme")
		assert.Equal(t, "masterKey123", apiKey, "API key should match expected value")
	})
}
