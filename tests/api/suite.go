// Package api provides a comprehensive test suite framework for the Hermes API.
//
// This package includes:
//   - Test suite setup and teardown
//   - HTTP test client with fluent assertions
//   - Database fixture builders
//   - Mock and real storage provider support
//   - Authentication helpers
package api

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/hashicorp-forge/hermes/internal/api"
	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/internal/server"
	"github.com/hashicorp-forge/hermes/internal/test"
	"github.com/hashicorp-forge/hermes/pkg/algolia"
	"github.com/hashicorp-forge/hermes/pkg/models"
	"github.com/hashicorp-forge/hermes/pkg/search"
	"github.com/hashicorp-forge/hermes/pkg/search/adapters/meilisearch"
	gw "github.com/hashicorp-forge/hermes/pkg/workspace/adapters/google"
	"github.com/hashicorp/go-hclog"
	"gorm.io/gorm"
)

// Suite provides a complete test environment for API tests.
type Suite struct {
	// Server is the test HTTP server
	Server *httptest.Server

	// Client is the HTTP test client
	Client *Client

	// DB is the test database connection
	DB *gorm.DB

	// DBName is the name of the test database
	DBName string

	// SearchProvider is the search backend (Meilisearch or mock)
	SearchProvider search.Provider

	// Config is the server configuration
	Config *config.Config

	// Ctx is the context for operations
	Ctx context.Context

	// T is the testing context
	T *testing.T

	// cleanup functions to run on teardown
	cleanupFuncs []func()
}

// Option configures the test suite.
type Option func(*Suite) error

// NewSuite creates a new test suite with a fresh database and configured backends.
//
// By default, it uses:
//   - PostgreSQL test database (created fresh for each test)
//   - Meilisearch for search (requires docker-compose)
//   - Mock Google Workspace
//
// Example:
//
//	suite := api.NewSuite(t,
//		api.WithAuthenticatedUser("test@example.com"),
//	)
//	defer suite.Cleanup()
func NewSuite(t *testing.T, opts ...Option) *Suite {
	suite := &Suite{
		T:            t,
		Ctx:          context.Background(),
		cleanupFuncs: make([]func(), 0),
	}

	// Create test database
	if err := suite.setupDatabase(); err != nil {
		t.Fatalf("Failed to setup database: %v", err)
	}

	// Create search provider (Meilisearch by default)
	if err := suite.setupSearch(); err != nil {
		t.Fatalf("Failed to setup search: %v", err)
	}

	// Create test configuration
	suite.Config = suite.createTestConfig()

	// Apply options before server creation
	for _, opt := range opts {
		if err := opt(suite); err != nil {
			suite.Cleanup()
			t.Fatalf("Failed to apply option: %v", err)
		}
	}

	// Create test server
	if err := suite.setupServer(); err != nil {
		suite.Cleanup()
		t.Fatalf("Failed to setup server: %v", err)
	}

	// Create test client
	suite.Client = NewClient(suite.Server.URL, suite.T)

	return suite
}

// setupDatabase creates a fresh PostgreSQL database for testing.
func (s *Suite) setupDatabase() error {
	dsn := os.Getenv("HERMES_TEST_POSTGRESQL_DSN")
	if dsn == "" {
		dsn = "host=localhost user=postgres password=postgres port=5432 sslmode=disable"
	}

	db, dbName, err := test.CreateTestDatabase(s.T, dsn)
	if err != nil {
		return fmt.Errorf("failed to create test database: %w", err)
	}

	s.DB = db
	s.DBName = dbName

	// Auto-migrate models
	if err := db.AutoMigrate(models.ModelsToAutoMigrate()...); err != nil {
		return fmt.Errorf("failed to auto-migrate: %w", err)
	}

	// Seed database with essential data
	if err := s.seedDatabase(db); err != nil {
		return fmt.Errorf("failed to seed database: %w", err)
	}

	// Add cleanup function
	s.cleanupFuncs = append(s.cleanupFuncs, func() {
		test.DropTestDatabase(dsn, dbName)
	})

	return nil
}

// setupSearch creates a Meilisearch search provider.
func (s *Suite) setupSearch() error {
	meilisearchHost := os.Getenv("HERMES_TEST_MEILISEARCH_HOST")
	if meilisearchHost == "" {
		meilisearchHost = "http://localhost:7700"
	}

	adapter, err := meilisearch.NewAdapter(&meilisearch.Config{
		Host:            meilisearchHost,
		APIKey:          "masterKey123",
		DocsIndexName:   fmt.Sprintf("test-docs-%d", time.Now().UnixNano()),
		DraftsIndexName: fmt.Sprintf("test-drafts-%d", time.Now().UnixNano()),
	})
	if err != nil {
		return fmt.Errorf("failed to create meilisearch adapter: %w", err)
	}

	// Verify Meilisearch is healthy
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := adapter.Healthy(ctx); err != nil {
		return fmt.Errorf("meilisearch not available: %w (make sure to run 'make docker/dev/start')", err)
	}

	s.SearchProvider = adapter

	// Add cleanup to clear indexes
	s.cleanupFuncs = append(s.cleanupFuncs, func() {
		ctx := context.Background()
		adapter.DocumentIndex().Clear(ctx)
		adapter.DraftIndex().Clear(ctx)
	})

	return nil
}

// createTestConfig creates a test configuration.
func (s *Suite) createTestConfig() *config.Config {
	return &config.Config{
		BaseURL: "http://localhost:8000",
		Algolia: &algolia.Config{
			ApplicationID:   "test-app-id",
			DocsIndexName:   "test-docs",
			DraftsIndexName: "test-drafts",
		},
		DocumentTypes: &config.DocumentTypes{
			DocumentType: []*config.DocumentType{
				{
					Name:     "RFC",
					LongName: "Request for Comments",
					Template: "test-template-id",
				},
				{
					Name:     "PRD",
					LongName: "Product Requirements Document",
					Template: "test-template-id",
				},
			},
		},
	}
}

// seedDatabase inserts essential test data.
func (s *Suite) seedDatabase(db *gorm.DB) error {
	// Create document types
	docTypes := []models.DocumentType{
		{Name: "RFC", LongName: "Request for Comments"},
		{Name: "PRD", LongName: "Product Requirements Document"},
		{Name: "FRD", LongName: "Feature Requirements Document"},
	}
	for _, dt := range docTypes {
		if err := db.Create(&dt).Error; err != nil {
			return fmt.Errorf("failed to create document type %s: %w", dt.Name, err)
		}
	}

	// Create default product
	product := models.Product{
		Name:         "Test Product",
		Abbreviation: "TEST",
	}
	if err := db.Create(&product).Error; err != nil {
		return fmt.Errorf("failed to create product: %w", err)
	}

	return nil
}

// setupServer creates the test HTTP server.
func (s *Suite) setupServer() error {
	// Create empty Algolia clients (handlers will use database/search provider instead)
	// These are kept as empty structs to satisfy the API handler signatures
	algoSearch := &algolia.Client{}
	algoWrite := &algolia.Client{}

	// Create mock Google Workspace service
	gwService := &gw.Service{}

	// Create server
	srv := &server.Server{
		AlgoSearch: algoSearch,
		AlgoWrite:  algoWrite,
		Config:     s.Config,
		DB:         s.DB,
		GWService:  gwService,
		Logger:     hclog.NewNullLogger(),
	}

	// Create mux and register endpoints (mimicking internal/cmd/commands/server/server.go)
	mux := http.NewServeMux()

	// Register key API v1 endpoints (add more as needed for tests)
	mux.Handle("/api/v1/documents/",
		api.DocumentHandler(s.Config, srv.Logger, algoSearch, algoWrite, gwService, s.DB))
	mux.Handle("/api/v1/drafts",
		api.DraftsHandler(s.Config, srv.Logger, algoSearch, algoWrite, gwService, s.DB))
	mux.Handle("/api/v1/drafts/",
		api.DraftsDocumentHandler(s.Config, srv.Logger, algoSearch, algoWrite, gwService, s.DB))
	mux.Handle("/api/v1/products",
		api.ProductsHandler(s.Config, algoSearch, srv.Logger))
	mux.Handle("/api/v1/reviews/",
		api.ReviewHandler(s.Config, srv.Logger, algoSearch, algoWrite, gwService, s.DB))

	// Create test server
	s.Server = httptest.NewServer(mux)

	// Add cleanup
	s.cleanupFuncs = append(s.cleanupFuncs, func() {
		s.Server.Close()
	})

	return nil
}

// Cleanup tears down the test environment.
func (s *Suite) Cleanup() {
	// Run cleanup functions in reverse order
	for i := len(s.cleanupFuncs) - 1; i >= 0; i-- {
		s.cleanupFuncs[i]()
	}
}

// WithAuthenticatedUser sets up an authenticated user for tests.
func WithAuthenticatedUser(email string) Option {
	return func(s *Suite) error {
		s.Client.SetAuth(email)
		return nil
	}
}

// WithMockSearch uses a mock search provider instead of real Meilisearch.
func WithMockSearch() Option {
	return func(s *Suite) error {
		s.SearchProvider = &mockSearchProvider{}
		return nil
	}
}

// mockSearchProvider is a simple mock for search.Provider.
type mockSearchProvider struct{}

func (m *mockSearchProvider) DocumentIndex() search.DocumentIndex {
	return &mockDocumentIndex{}
}

func (m *mockSearchProvider) DraftIndex() search.DraftIndex {
	return &mockDraftIndex{}
}

func (m *mockSearchProvider) Name() string {
	return "mock"
}

func (m *mockSearchProvider) Healthy(ctx context.Context) error {
	return nil
}

type mockDocumentIndex struct{}

func (m *mockDocumentIndex) Index(ctx context.Context, doc *search.Document) error {
	return nil
}

func (m *mockDocumentIndex) IndexBatch(ctx context.Context, docs []*search.Document) error {
	return nil
}

func (m *mockDocumentIndex) Delete(ctx context.Context, docID string) error {
	return nil
}

func (m *mockDocumentIndex) DeleteBatch(ctx context.Context, docIDs []string) error {
	return nil
}

func (m *mockDocumentIndex) Search(ctx context.Context, query *search.SearchQuery) (*search.SearchResult, error) {
	return &search.SearchResult{
		Hits:       []*search.Document{},
		TotalHits:  0,
		Page:       query.Page,
		PerPage:    query.PerPage,
		TotalPages: 0,
		Facets:     &search.Facets{},
		QueryTime:  0,
	}, nil
}

func (m *mockDocumentIndex) GetFacets(ctx context.Context, facetNames []string) (*search.Facets, error) {
	return &search.Facets{}, nil
}

func (m *mockDocumentIndex) Clear(ctx context.Context) error {
	return nil
}

type mockDraftIndex struct{}

func (m *mockDraftIndex) Index(ctx context.Context, doc *search.Document) error {
	return nil
}

func (m *mockDraftIndex) IndexBatch(ctx context.Context, docs []*search.Document) error {
	return nil
}

func (m *mockDraftIndex) Delete(ctx context.Context, docID string) error {
	return nil
}

func (m *mockDraftIndex) DeleteBatch(ctx context.Context, docIDs []string) error {
	return nil
}

func (m *mockDraftIndex) Search(ctx context.Context, query *search.SearchQuery) (*search.SearchResult, error) {
	return &search.SearchResult{
		Hits:       []*search.Document{},
		TotalHits:  0,
		Page:       query.Page,
		PerPage:    query.PerPage,
		TotalPages: 0,
		Facets:     &search.Facets{},
		QueryTime:  0,
	}, nil
}

func (m *mockDraftIndex) GetFacets(ctx context.Context, facetNames []string) (*search.Facets, error) {
	return &search.Facets{}, nil
}

func (m *mockDraftIndex) Clear(ctx context.Context) error {
	return nil
}

// ModelToSearchDocument converts a models.Document to a search.Document.
// This is a helper for tests to index database documents in the search backend.
func ModelToSearchDocument(doc *models.Document) *search.Document {
	// Convert status enum to string
	var status string
	switch doc.Status {
	case models.ApprovedDocumentStatus:
		status = "Approved"
	case models.InReviewDocumentStatus:
		status = "In-Review"
	case models.ObsoleteDocumentStatus:
		status = "Obsolete"
	case models.WIPDocumentStatus:
		status = "WIP"
	default:
		status = "WIP"
	}

	searchDoc := &search.Document{
		ObjectID:     doc.GoogleFileID,
		DocID:        doc.GoogleFileID,
		Title:        doc.Title,
		DocNumber:    fmt.Sprintf("%d", doc.DocumentNumber),
		DocType:      doc.DocumentType.Name,
		Status:       status,
		CustomFields: make(map[string]interface{}),
	}

	// Set product if present
	if doc.Product.Name != "" {
		searchDoc.Product = doc.Product.Name
	}

	// Set summary if present
	if doc.Summary != nil {
		searchDoc.Summary = *doc.Summary
	}

	// Set owner
	if doc.Owner != nil {
		searchDoc.Owners = []string{doc.Owner.EmailAddress}
	}

	// Set contributors
	for _, c := range doc.Contributors {
		if c != nil {
			searchDoc.Contributors = append(searchDoc.Contributors, c.EmailAddress)
		}
	}

	// Set approvers
	for _, a := range doc.Approvers {
		if a != nil {
			searchDoc.Approvers = append(searchDoc.Approvers, a.EmailAddress)
		}
	}

	// Set timestamps
	searchDoc.CreatedTime = doc.DocumentCreatedAt.Unix()
	searchDoc.ModifiedTime = doc.DocumentModifiedAt.Unix()
	searchDoc.IndexedAt = time.Now()

	// Set custom fields
	for _, cf := range doc.CustomFields {
		if cf != nil {
			searchDoc.CustomFields[cf.DocumentTypeCustomField.Name] = cf.Value
		}
	}

	return searchDoc
}
