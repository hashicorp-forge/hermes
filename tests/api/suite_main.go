//go:build integration
// +build integration

// Package api provides a comprehensive test suite framework for the Hermes API.
//
// Test Architecture:
//   - TestMain: Starts Docker containers (PostgreSQL, Meilisearch) once for all tests
//   - MainTestSuite: Provides shared infrastructure (DB, search, workspace) to child suites
//   - V1TestSuite: Tests V1 API endpoints using MainTestSuite infrastructure
//   - V2TestSuite: Tests V2 API endpoints using MainTestSuite infrastructure
//
// Each test uses:
//   - Unique document IDs (prefixed by test name) for data isolation
//   - Local workspace adapter with in-memory filesystem (closer to end-to-end than mocks)
//   - Shared PostgreSQL schema isolation per test
//   - Shared Meilisearch indexes with unique document IDs
package api

import (
	"context"
	"fmt"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/internal/test"
	"github.com/hashicorp-forge/hermes/pkg/models"
	"github.com/hashicorp-forge/hermes/pkg/search"
	"github.com/hashicorp-forge/hermes/pkg/search/adapters/meilisearch"
	"github.com/hashicorp-forge/hermes/pkg/workspace"
	"github.com/hashicorp-forge/hermes/pkg/workspace/adapters/mock"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

// MainTestSuite provides shared infrastructure for all API tests.
// It manages Docker containers and creates isolated test environments for each test.
type MainTestSuite struct {
	T *testing.T

	// Shared infrastructure (created once, reused across tests)
	containers *SharedTestContainers

	// Per-test infrastructure (created fresh for each test)
	DB                *gorm.DB
	DBSchema          string
	SearchProvider    search.Provider
	WorkspaceProvider workspace.Provider
	Config            *config.Config
	TestServer        *httptest.Server
	Client            *Client

	// Cleanup functions
	cleanupFuncs []func()
}

// NewMainTestSuite creates a new main test suite using shared Docker containers.
// This is the primary entry point for all API integration tests.
//
// Example:
//
//	suite := NewMainTestSuite(t)
//	defer suite.Cleanup()
//
//	// Use suite.Client to make HTTP requests
//	resp := suite.Client.Get("/api/v1/products")
func NewMainTestSuite(t *testing.T) *MainTestSuite {
	// Get shared Docker containers (started once in TestMain)
	containers := GetSharedContainers()
	require.NotNil(t, containers, "Shared containers not initialized - TestMain may have failed")

	suite := &MainTestSuite{
		T:            t,
		containers:   containers,
		cleanupFuncs: make([]func(), 0),
	}

	// Create isolated database schema for this test
	suite.setupDatabase()

	// Create search provider with unique indexes for this test
	suite.setupSearchProvider()

	// Create local workspace adapter with in-memory filesystem
	suite.setupWorkspaceProvider()

	// Create test configuration
	suite.setupConfig()

	// Seed database with essential data
	suite.seedDatabase()

	// Create test server - NOTE: Tests will need to create handlers themselves
	// or call setupServerManually() if they need a full server
	suite.TestServer = nil
	suite.Client = nil

	return suite
}

// setupDatabase creates an isolated PostgreSQL schema for this test.
func (s *MainTestSuite) setupDatabase() {
	db, schemaName := CreateTestDatabaseForTest(s.T)
	s.DB = db
	s.DBSchema = schemaName

	s.T.Logf("📊 Created isolated database schema: %s", schemaName)
}

// setupSearchProvider creates a Meilisearch provider with unique indexes.
func (s *MainTestSuite) setupSearchProvider() {
	// Use unique index names per test to avoid conflicts
	testID := time.Now().UnixNano()

	adapter, err := meilisearch.NewAdapter(&meilisearch.Config{
		Host:            s.containers.MeilisearchHost,
		APIKey:          s.containers.MeilisearchAPIKey,
		DocsIndexName:   fmt.Sprintf("test-docs-%d", testID),
		DraftsIndexName: fmt.Sprintf("test-drafts-%d", testID),
	})
	require.NoError(s.T, err, "Failed to create Meilisearch adapter")

	// Verify health
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	err = adapter.Healthy(ctx)
	require.NoError(s.T, err, "Meilisearch is not healthy")

	s.SearchProvider = adapter

	// Add cleanup to clear indexes
	s.cleanupFuncs = append(s.cleanupFuncs, func() {
		ctx := context.Background()
		adapter.DocumentIndex().Clear(ctx)
		adapter.DraftIndex().Clear(ctx)
	})

	s.T.Logf("🔍 Created search indexes: test-docs-%d, test-drafts-%d", testID, testID)
}

// setupWorkspaceProvider creates a workspace provider for testing.
// Uses mock adapter which implements the full workspace.Provider interface.
// TODO: In the future, we can enhance this to use the local adapter with afero
// in-memory filesystem for closer end-to-end testing.
func (s *MainTestSuite) setupWorkspaceProvider() {
	// Use mock adapter which implements workspace.Provider directly
	s.WorkspaceProvider = mock.NewAdapter()

	s.T.Logf("📁 Created mock workspace provider (TODO: migrate to local adapter with afero)")
}

// setupConfig creates test configuration.
func (s *MainTestSuite) setupConfig() {
	s.Config = &config.Config{
		BaseURL: "http://localhost:8000",
		DocumentTypes: &config.DocumentTypes{
			DocumentType: []*config.DocumentType{
				{
					Name:     "RFC",
					LongName: "Request for Comments",
					Template: "template-rfc-id",
				},
				{
					Name:     "PRD",
					LongName: "Product Requirements Document",
					Template: "template-prd-id",
				},
				{
					Name:     "FRD",
					LongName: "Feature Requirements Document",
					Template: "template-frd-id",
				},
			},
		},
		GoogleWorkspace: &config.GoogleWorkspace{
			DraftsFolder:          "test-drafts-folder",
			TemporaryDraftsFolder: "test-temp-drafts-folder",
		},
	}
}

// seedDatabase inserts essential test data.
func (s *MainTestSuite) seedDatabase() {
	// Create document types
	docTypes := []models.DocumentType{
		{Name: "RFC", LongName: "Request for Comments"},
		{Name: "PRD", LongName: "Product Requirements Document"},
		{Name: "FRD", LongName: "Feature Requirements Document"},
	}
	for _, dt := range docTypes {
		if err := s.DB.Create(&dt).Error; err != nil {
			s.T.Fatalf("Failed to create document type %s: %v", dt.Name, err)
		}
	}

	// Create default products
	products := []models.Product{
		{
			Name:         "Test Product",
			Abbreviation: "TEST",
		},
		{
			Name:         "Infrastructure",
			Abbreviation: "INFRA",
		},
	}
	for _, p := range products {
		if err := s.DB.Create(&p).Error; err != nil {
			s.T.Fatalf("Failed to create product %s: %v", p.Name, err)
		}
	}

	s.T.Logf("✅ Seeded database with %d document types and %d products", len(docTypes), len(products))
}

// setupServer creates the test HTTP server.
// This is deferred and should be called explicitly by tests that need it.
// Most tests can create handlers directly without a full server.
func (s *MainTestSuite) setupServer() {
	// TODO: Implement when we need full server testing
	// For now, tests create handlers directly
	panic("setupServer not implemented - tests should create handlers directly")
}

// Cleanup tears down the test suite (but not shared Docker containers).
func (s *MainTestSuite) Cleanup() {
	for i := len(s.cleanupFuncs) - 1; i >= 0; i-- {
		s.cleanupFuncs[i]()
	}

	// Drop test schema
	if s.DB != nil && s.DBSchema != "" {
		test.DropTestDatabase(s.containers.PostgresDSN, s.DBSchema)
	}
}

// GetUniqueDocID generates a unique document ID for this test.
// Uses test name as prefix to make it easy to trace documents back to tests.
func (s *MainTestSuite) GetUniqueDocID(suffix string) string {
	// Get test name (remove "Test" prefix for brevity)
	testName := s.T.Name()
	if len(testName) > 4 && testName[:4] == "Test" {
		testName = testName[4:]
	}

	// Create unique ID: testname-timestamp-suffix
	return fmt.Sprintf("%s-%d-%s", testName, time.Now().UnixNano(), suffix)
}
