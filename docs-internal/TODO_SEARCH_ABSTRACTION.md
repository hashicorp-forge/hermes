# TODO: Search Abstraction & Local Workspace API

**Status**: Planned  
**Priority**: High  
**Effort**: Large (6-8 weeks)  
**Dependencies**: 
- TODO_API_STORAGE_MIGRATION.md (storage abstraction provides pattern)
- Meilisearch Docker setup
- Local workspace adapter working

## Overview

Create a search abstraction layer similar to the storage abstraction, enabling:
1. **Multiple search backends** (Algolia, Meilisearch, etc.)
2. **Local development** without Algolia credentials
3. **Cost optimization** by using self-hosted search
4. **REST API for workspace operations** that mirrors existing API patterns
5. **Easier testing** with local search infrastructure

This follows the same architectural pattern established by the storage abstraction, providing a clean interface for search operations while allowing different implementations.

## Motivation

### Current State
- Hermes is tightly coupled to Algolia for search
- Local development requires Algolia API keys
- Search costs scale with usage
- Testing requires mocking Algolia
- No ability to self-host search

### Desired State
- Search backend is abstracted behind an interface
- Local development uses Meilisearch in Docker
- Production can use Algolia or Meilisearch
- Tests run against real search backend
- Easy to add new search providers

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     API Handlers                         │
│  (documents, drafts, reviews, search endpoints)          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Search Provider Interface                   │
│  • IndexDocument()                                       │
│  • UpdateDocument()                                      │
│  • DeleteDocument()                                      │
│  • SearchDocuments()                                     │
│  • SearchDrafts()                                        │
│  • GetFacets()                                          │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
┌──────────────────┐    ┌──────────────────┐
│ Algolia Adapter  │    │ Meilisearch      │
│                  │    │ Adapter          │
│ • Current impl   │    │ • Local dev      │
│ • Production use │    │ • Self-hosted    │
│ • Cloud hosted   │    │ • Open source    │
└──────────────────┘    └──────────────────┘
```

## Phase 1: Search Abstraction Interface (Week 1-2)

### 1.1 Define Search Interfaces

**File**: `pkg/search/search.go`

```go
package search

import (
	"context"
	"time"
)

// Provider defines the interface for search operations.
type Provider interface {
	// DocumentIndex returns the document search interface.
	DocumentIndex() DocumentIndex
	
	// DraftIndex returns the draft document search interface.
	DraftIndex() DraftIndex
	
	// Name returns the provider name.
	Name() string
	
	// Healthy checks if the search backend is accessible.
	Healthy(ctx context.Context) error
}

// DocumentIndex handles published document search operations.
type DocumentIndex interface {
	// Index adds or updates a document in the search index.
	Index(ctx context.Context, doc *Document) error
	
	// IndexBatch adds or updates multiple documents.
	IndexBatch(ctx context.Context, docs []*Document) error
	
	// Delete removes a document from the search index.
	Delete(ctx context.Context, docID string) error
	
	// DeleteBatch removes multiple documents.
	DeleteBatch(ctx context.Context, docIDs []string) error
	
	// Search performs a search query.
	Search(ctx context.Context, query *SearchQuery) (*SearchResult, error)
	
	// GetFacets retrieves available facets for filtering.
	GetFacets(ctx context.Context, facetNames []string) (*Facets, error)
	
	// Clear removes all documents from the index (use with caution).
	Clear(ctx context.Context) error
}

// DraftIndex handles draft document search operations.
type DraftIndex interface {
	// Same methods as DocumentIndex but for drafts
	Index(ctx context.Context, doc *Document) error
	IndexBatch(ctx context.Context, docs []*Document) error
	Delete(ctx context.Context, docID string) error
	DeleteBatch(ctx context.Context, docIDs []string) error
	Search(ctx context.Context, query *SearchQuery) (*SearchResult, error)
	GetFacets(ctx context.Context, facetNames []string) (*Facets, error)
	Clear(ctx context.Context) error
}

// Document represents a searchable document.
type Document struct {
	ObjectID         string                 `json:"objectID"`
	DocID            string                 `json:"docID"`
	Title            string                 `json:"title"`
	DocNumber        string                 `json:"docNumber"`
	DocType          string                 `json:"docType"`
	Product          string                 `json:"product"`
	Status           string                 `json:"status"`
	Owners           []string               `json:"owners"`
	Contributors     []string               `json:"contributors"`
	Approvers        []string               `json:"approvers"`
	Summary          string                 `json:"summary"`
	Content          string                 `json:"content"`
	CreatedTime      int64                  `json:"createdTime"`
	ModifiedTime     int64                  `json:"modifiedTime"`
	CustomFields     map[string]interface{} `json:"customFields,omitempty"`
	
	// Timestamps for internal use
	IndexedAt        time.Time              `json:"-"`
}

// SearchQuery defines search parameters.
type SearchQuery struct {
	// Query text
	Query string
	
	// Pagination
	Page     int
	PerPage  int
	
	// Filters
	Filters map[string][]string // e.g., {"product": ["terraform"], "status": ["approved"]}
	
	// Facets to return
	Facets []string
	
	// Sorting
	SortBy    string // Field name
	SortOrder string // "asc" or "desc"
	
	// Highlighting
	HighlightPreTag  string
	HighlightPostTag string
}

// SearchResult contains search results.
type SearchResult struct {
	Hits       []*Document
	TotalHits  int
	Page       int
	PerPage    int
	TotalPages int
	Facets     *Facets
	QueryTime  time.Duration
}

// Facets contains facet values for filtering.
type Facets struct {
	Products   map[string]int `json:"products"`
	DocTypes   map[string]int `json:"docTypes"`
	Statuses   map[string]int `json:"statuses"`
	Owners     map[string]int `json:"owners"`
}
```

**File**: `pkg/search/types.go` - Additional types and helpers

**File**: `pkg/search/errors.go` - Standard error types

```go
package search

import "errors"

var (
	// ErrNotFound indicates a document was not found in the index.
	ErrNotFound = errors.New("document not found in search index")
	
	// ErrInvalidQuery indicates the search query is malformed.
	ErrInvalidQuery = errors.New("invalid search query")
	
	// ErrBackendUnavailable indicates the search backend is not accessible.
	ErrBackendUnavailable = errors.New("search backend unavailable")
	
	// ErrIndexingFailed indicates document indexing failed.
	ErrIndexingFailed = errors.New("failed to index document")
)

// Error wraps a search error with context.
type Error struct {
	Op  string // Operation that failed
	Err error  // Underlying error
	Msg string // Additional context
}

func (e *Error) Error() string {
	if e.Msg != "" {
		return e.Op + ": " + e.Msg + ": " + e.Err.Error()
	}
	return e.Op + ": " + e.Err.Error()
}

func (e *Error) Unwrap() error {
	return e.Err
}
```

### 1.2 Create Algolia Adapter (Refactor existing code)

**File**: `pkg/search/adapters/algolia/adapter.go`

```go
package algolia

import (
	"context"
	"fmt"
	
	"github.com/algolia/algoliasearch-client-go/v3/algolia/search"
	"github.com/hashicorp-forge/hermes/pkg/search"
)

// Adapter implements search.Provider for Algolia.
type Adapter struct {
	client     *search.Client
	docsIndex  *search.Index
	draftsIndex *search.Index
	appID      string
}

// Config contains Algolia configuration.
type Config struct {
	AppID           string
	SearchAPIKey    string
	WriteAPIKey     string
	DocsIndexName   string
	DraftsIndexName string
}

// NewAdapter creates a new Algolia search adapter.
func NewAdapter(cfg *Config) (*Adapter, error) {
	if cfg.AppID == "" || cfg.WriteAPIKey == "" {
		return nil, fmt.Errorf("algolia credentials required")
	}
	
	client := search.NewClient(cfg.AppID, cfg.WriteAPIKey)
	
	return &Adapter{
		client:      client,
		docsIndex:   client.InitIndex(cfg.DocsIndexName),
		draftsIndex: client.InitIndex(cfg.DraftsIndexName),
		appID:       cfg.AppID,
	}, nil
}

// DocumentIndex returns the document search interface.
func (a *Adapter) DocumentIndex() search.DocumentIndex {
	return &documentIndex{
		index: a.docsIndex,
	}
}

// DraftIndex returns the draft search interface.
func (a *Adapter) DraftIndex() search.DraftIndex {
	return &draftIndex{
		index: a.draftsIndex,
	}
}

// Name returns the provider name.
func (a *Adapter) Name() string {
	return "algolia"
}

// Healthy checks if Algolia is accessible.
func (a *Adapter) Healthy(ctx context.Context) error {
	// Try to get index settings as health check
	_, err := a.docsIndex.GetSettings()
	if err != nil {
		return fmt.Errorf("algolia health check failed: %w", err)
	}
	return nil
}

// documentIndex implements search.DocumentIndex.
type documentIndex struct {
	index *search.Index
}

func (di *documentIndex) Index(ctx context.Context, doc *search.Document) error {
	_, err := di.index.SaveObject(doc)
	if err != nil {
		return &search.Error{
			Op:  "Index",
			Err: search.ErrIndexingFailed,
			Msg: err.Error(),
		}
	}
	return nil
}

// ... implement other methods
```

**Task List:**
- [ ] Create `pkg/search/` package structure
- [ ] Define `Provider` interface
- [ ] Define `DocumentIndex` and `DraftIndex` interfaces
- [ ] Define data types (`Document`, `SearchQuery`, `SearchResult`, `Facets`)
- [ ] Define error types
- [ ] Create Algolia adapter in `pkg/search/adapters/algolia/`
- [ ] Migrate existing `pkg/algolia/` code to new adapter
- [ ] Add unit tests for interfaces
- [ ] Add integration tests for Algolia adapter

## Phase 2: Meilisearch Integration (Week 2-3)

### 2.1 Add Meilisearch to Docker Compose

**File**: `docker-compose.yml`

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:17.1-alpine
    environment:
      POSTGRES_DB: hermes
      POSTGRES_USER: hermes
      POSTGRES_PASSWORD: hermes
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U hermes"]
      interval: 5s
      timeout: 5s
      retries: 5

  meilisearch:
    image: getmeili/meilisearch:v1.5
    environment:
      MEILI_ENV: development
      MEILI_MASTER_KEY: masterKey123
      MEILI_NO_ANALYTICS: true
    ports:
      - "7700:7700"
    volumes:
      - meilisearch_data:/meili_data
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:7700/health"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  meilisearch_data:
```

**Makefile additions:**

```makefile
.PHONY: docker/meilisearch/start
docker/meilisearch/start:
	@echo "Starting Meilisearch..."
	docker-compose up -d meilisearch
	@echo "Waiting for Meilisearch to be ready..."
	@until curl -s http://localhost:7700/health > /dev/null; do sleep 1; done
	@echo "Meilisearch is ready at http://localhost:7700"

.PHONY: docker/meilisearch/stop
docker/meilisearch/stop:
	@echo "Stopping Meilisearch..."
	docker-compose stop meilisearch

.PHONY: docker/meilisearch/clear
docker/meilisearch/clear:
	@echo "Stopping and removing Meilisearch data..."
	docker-compose down -v meilisearch

.PHONY: docker/dev/start
docker/dev/start:
	@echo "Starting development environment (PostgreSQL + Meilisearch)..."
	docker-compose up -d
	@echo "Waiting for services to be ready..."
	@until docker-compose ps | grep -q "Up (healthy).*postgres"; do sleep 1; done
	@until docker-compose ps | grep -q "Up (healthy).*meilisearch"; do sleep 1; done
	@echo "Development environment ready!"
	@echo "  PostgreSQL: localhost:5432"
	@echo "  Meilisearch: http://localhost:7700"

.PHONY: docker/dev/stop
docker/dev/stop:
	@echo "Stopping development environment..."
	docker-compose down
```

**Task List:**
- [ ] Add Meilisearch service to `docker-compose.yml`
- [ ] Configure environment variables
- [ ] Add health checks
- [ ] Create Makefile targets
- [ ] Test docker-compose setup
- [ ] Document setup in README

### 2.2 Implement Meilisearch Adapter

**File**: `pkg/search/adapters/meilisearch/adapter.go`

```go
package meilisearch

import (
	"context"
	"fmt"
	"time"
	
	"github.com/meilisearch/meilisearch-go"
	"github.com/hashicorp-forge/hermes/pkg/search"
)

// Adapter implements search.Provider for Meilisearch.
type Adapter struct {
	client     *meilisearch.Client
	docsIndex  string
	draftsIndex string
}

// Config contains Meilisearch configuration.
type Config struct {
	Host           string // e.g., "http://localhost:7700"
	APIKey         string // Master key
	DocsIndexName  string
	DraftsIndexName string
}

// NewAdapter creates a new Meilisearch search adapter.
func NewAdapter(cfg *Config) (*Adapter, error) {
	if cfg.Host == "" {
		return nil, fmt.Errorf("meilisearch host required")
	}
	
	client := meilisearch.NewClient(meilisearch.ClientConfig{
		Host:   cfg.Host,
		APIKey: cfg.APIKey,
	})
	
	adapter := &Adapter{
		client:      client,
		docsIndex:   cfg.DocsIndexName,
		draftsIndex: cfg.DraftsIndexName,
	}
	
	// Initialize indexes with settings
	if err := adapter.initializeIndexes(context.Background()); err != nil {
		return nil, fmt.Errorf("failed to initialize indexes: %w", err)
	}
	
	return adapter, nil
}

// initializeIndexes sets up index configuration.
func (a *Adapter) initializeIndexes(ctx context.Context) error {
	// Create/update documents index
	docsIdx := a.client.Index(a.docsIndex)
	
	// Configure searchable attributes
	_, err := docsIdx.UpdateSearchableAttributes(&[]string{
		"title",
		"docNumber",
		"summary",
		"content",
		"owners",
		"contributors",
	})
	if err != nil {
		return err
	}
	
	// Configure filterable attributes
	_, err = docsIdx.UpdateFilterableAttributes(&[]string{
		"product",
		"docType",
		"status",
		"owners",
		"createdTime",
		"modifiedTime",
	})
	if err != nil {
		return err
	}
	
	// Configure sortable attributes
	_, err = docsIdx.UpdateSortableAttributes(&[]string{
		"createdTime",
		"modifiedTime",
		"title",
	})
	if err != nil {
		return err
	}
	
	// Repeat for drafts index
	draftsIdx := a.client.Index(a.draftsIndex)
	// ... same configuration
	
	return nil
}

// DocumentIndex returns the document search interface.
func (a *Adapter) DocumentIndex() search.DocumentIndex {
	return &documentIndex{
		client: a.client,
		index:  a.docsIndex,
	}
}

// DraftIndex returns the draft search interface.
func (a *Adapter) DraftIndex() search.DraftIndex {
	return &draftIndex{
		client: a.client,
		index:  a.draftsIndex,
	}
}

// Name returns the provider name.
func (a *Adapter) Name() string {
	return "meilisearch"
}

// Healthy checks if Meilisearch is accessible.
func (a *Adapter) Healthy(ctx context.Context) error {
	health, err := a.client.Health()
	if err != nil {
		return fmt.Errorf("meilisearch health check failed: %w", err)
	}
	if health.Status != "available" {
		return fmt.Errorf("meilisearch status: %s", health.Status)
	}
	return nil
}

// documentIndex implements search.DocumentIndex.
type documentIndex struct {
	client *meilisearch.Client
	index  string
}

func (di *documentIndex) Index(ctx context.Context, doc *search.Document) error {
	idx := di.client.Index(di.index)
	
	task, err := idx.AddDocuments([]interface{}{doc}, "objectID")
	if err != nil {
		return &search.Error{
			Op:  "Index",
			Err: search.ErrIndexingFailed,
			Msg: err.Error(),
		}
	}
	
	// Wait for indexing to complete (optional, configurable)
	_, err = di.client.WaitForTask(task.TaskUID, 5000) // 5 second timeout
	if err != nil {
		return fmt.Errorf("indexing task failed: %w", err)
	}
	
	return nil
}

func (di *documentIndex) Search(ctx context.Context, query *search.SearchQuery) (*search.SearchResult, error) {
	idx := di.client.Index(di.index)
	
	// Build Meilisearch request
	req := &meilisearch.SearchRequest{
		Limit:  int64(query.PerPage),
		Offset: int64(query.Page * query.PerPage),
	}
	
	// Add filters
	if len(query.Filters) > 0 {
		filters := buildMeilisearchFilters(query.Filters)
		req.Filter = filters
	}
	
	// Add facets
	if len(query.Facets) > 0 {
		req.Facets = query.Facets
	}
	
	// Add sorting
	if query.SortBy != "" {
		sort := query.SortBy
		if query.SortOrder == "desc" {
			sort += ":desc"
		} else {
			sort += ":asc"
		}
		req.Sort = []string{sort}
	}
	
	// Execute search
	start := time.Now()
	resp, err := idx.Search(query.Query, req)
	if err != nil {
		return nil, &search.Error{
			Op:  "Search",
			Err: err,
		}
	}
	queryTime := time.Since(start)
	
	// Convert results
	hits := make([]*search.Document, len(resp.Hits))
	for i, hit := range resp.Hits {
		doc, err := convertMeilisearchHit(hit)
		if err != nil {
			continue // Skip invalid hits
		}
		hits[i] = doc
	}
	
	// Convert facets
	facets := convertMeilisearchFacets(resp.FacetDistribution)
	
	result := &search.SearchResult{
		Hits:       hits,
		TotalHits:  int(resp.EstimatedTotalHits),
		Page:       query.Page,
		PerPage:    query.PerPage,
		TotalPages: int(resp.EstimatedTotalHits) / query.PerPage,
		Facets:     facets,
		QueryTime:  queryTime,
	}
	
	return result, nil
}

// Helper functions
func buildMeilisearchFilters(filters map[string][]string) interface{} {
	// Convert to Meilisearch filter syntax
	// Example: product = "terraform" AND status IN ["approved", "published"]
	var filterParts []string
	for key, values := range filters {
		if len(values) == 1 {
			filterParts = append(filterParts, fmt.Sprintf("%s = %q", key, values[0]))
		} else {
			valueList := make([]string, len(values))
			for i, v := range values {
				valueList[i] = fmt.Sprintf("%q", v)
			}
			filterParts = append(filterParts, fmt.Sprintf("%s IN [%s]", key, strings.Join(valueList, ", ")))
		}
	}
	return strings.Join(filterParts, " AND ")
}

// ... implement other methods
```

**Task List:**
- [ ] Install Meilisearch Go client dependency
- [ ] Create Meilisearch adapter package
- [ ] Implement all `Provider` interface methods
- [ ] Implement index configuration
- [ ] Add filter conversion logic
- [ ] Add facet conversion logic
- [ ] Add error handling and retries
- [ ] Add unit tests
- [ ] Add integration tests with Docker

## Phase 3: Local Workspace REST API (Week 3-4)

### 3.1 Define Workspace API Endpoints

Create a REST API for local workspace operations that mirrors existing Hermes API patterns but works with the local storage adapter.

**Endpoints to implement:**

```
# Documents
GET    /api/v1/workspace/documents          - List documents
GET    /api/v1/workspace/documents/:id      - Get document
POST   /api/v1/workspace/documents          - Create document
PATCH  /api/v1/workspace/documents/:id      - Update document
DELETE /api/v1/workspace/documents/:id      - Delete document

# Drafts
GET    /api/v1/workspace/drafts             - List drafts
POST   /api/v1/workspace/drafts             - Create draft
POST   /api/v1/workspace/drafts/:id/publish - Publish draft

# Search
GET    /api/v1/workspace/search             - Search documents
GET    /api/v1/workspace/facets             - Get facets

# Templates
GET    /api/v1/workspace/templates          - List templates
GET    /api/v1/workspace/templates/:id      - Get template

# Health
GET    /api/v1/workspace/health             - Health check
```

**File**: `internal/api/workspace/handler.go`

```go
package workspace

import (
	"encoding/json"
	"net/http"
	
	"github.com/go-chi/chi/v5"
	"github.com/hashicorp-forge/hermes/pkg/search"
	"github.com/hashicorp-forge/hermes/pkg/storage"
	"github.com/hashicorp/go-hclog"
	"gorm.io/gorm"
)

// Handler provides workspace API endpoints.
type Handler struct {
	storage  storage.StorageProvider
	search   search.Provider
	db       *gorm.DB
	logger   hclog.Logger
}

// NewHandler creates a new workspace API handler.
func NewHandler(
	storage storage.StorageProvider,
	search search.Provider,
	db *gorm.DB,
	logger hclog.Logger,
) *Handler {
	return &Handler{
		storage: storage,
		search:  search,
		db:      db,
		logger:  logger,
	}
}

// Routes returns the workspace API routes.
func (h *Handler) Routes() chi.Router {
	r := chi.NewRouter()
	
	// Documents
	r.Get("/documents", h.ListDocuments)
	r.Get("/documents/{id}", h.GetDocument)
	r.Post("/documents", h.CreateDocument)
	r.Patch("/documents/{id}", h.UpdateDocument)
	r.Delete("/documents/{id}", h.DeleteDocument)
	
	// Drafts
	r.Get("/drafts", h.ListDrafts)
	r.Post("/drafts", h.CreateDraft)
	r.Post("/drafts/{id}/publish", h.PublishDraft)
	
	// Search
	r.Get("/search", h.Search)
	r.Get("/facets", h.GetFacets)
	
	// Templates
	r.Get("/templates", h.ListTemplates)
	r.Get("/templates/{id}", h.GetTemplate)
	
	// Health
	r.Get("/health", h.Health)
	
	return r
}

// CreateDocument creates a new document.
func (h *Handler) CreateDocument(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name      string `json:"name"`
		Content   string `json:"content"`
		DocType   string `json:"docType"`
		Product   string `json:"product"`
		Status    string `json:"status"`
		Owner     string `json:"owner"`
	}
	
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	
	// Create document via storage
	doc, err := h.storage.DocumentStorage().CreateDocument(r.Context(), &storage.DocumentCreate{
		Name:           req.Name,
		ParentFolderID: "docs",
		Content:        req.Content,
		Owner:          req.Owner,
	})
	if err != nil {
		h.logger.Error("failed to create document", "error", err)
		http.Error(w, "Failed to create document", http.StatusInternalServerError)
		return
	}
	
	// Index document for search
	searchDoc := &search.Document{
		ObjectID:    doc.ID,
		DocID:       doc.ID,
		Title:       req.Name,
		DocType:     req.DocType,
		Product:     req.Product,
		Status:      req.Status,
		Owners:      []string{req.Owner},
		Content:     req.Content,
		CreatedTime: doc.CreatedTime.Unix(),
		ModifiedTime: doc.ModifiedTime.Unix(),
	}
	
	if err := h.search.DocumentIndex().Index(r.Context(), searchDoc); err != nil {
		h.logger.Warn("failed to index document", "error", err, "docID", doc.ID)
		// Don't fail the request, indexing is async
	}
	
	// Return response
	w.Header().Set("Content-Type", "application/json")
	w.WriteStatus(http.StatusCreated)
	json.NewEncoder(w).Encode(doc)
}

// Search performs document search.
func (h *Handler) Search(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	page := parseInt(r.URL.Query().Get("page"), 0)
	perPage := parseInt(r.URL.Query().Get("per_page"), 20)
	
	// Build search query
	searchQuery := &search.SearchQuery{
		Query:   query,
		Page:    page,
		PerPage: perPage,
		Filters: parseFilters(r.URL.Query()),
		Facets:  []string{"products", "docTypes", "statuses"},
	}
	
	// Execute search
	result, err := h.search.DocumentIndex().Search(r.Context(), searchQuery)
	if err != nil {
		h.logger.Error("search failed", "error", err, "query", query)
		http.Error(w, "Search failed", http.StatusInternalServerError)
		return
	}
	
	// Return results
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// ... implement other handlers
```

**Task List:**
- [ ] Create `internal/api/workspace/` package
- [ ] Implement document CRUD handlers
- [ ] Implement draft handlers
- [ ] Implement search handlers
- [ ] Implement template handlers
- [ ] Add request validation
- [ ] Add response formatting
- [ ] Add error handling
- [ ] Add logging
- [ ] Wire up routes in main server
- [ ] Add middleware (auth, CORS, etc.)

### 3.2 Update Server Configuration

**File**: `configs/config.hcl` additions

```hcl
# Search configuration
search {
  provider = "meilisearch"  # or "algolia"
  
  meilisearch {
    host            = "http://localhost:7700"
    api_key         = "masterKey123"
    docs_index      = "hermes-documents"
    drafts_index    = "hermes-drafts"
  }
  
  algolia {
    app_id          = "${HERMES_ALGOLIA_APP_ID}"
    search_api_key  = "${HERMES_ALGOLIA_SEARCH_API_KEY}"
    write_api_key   = "${HERMES_ALGOLIA_WRITE_API_KEY}"
    docs_index      = "docs"
    drafts_index    = "drafts"
  }
}

# Workspace API configuration
workspace {
  enabled = true  # Enable local workspace API
  prefix  = "/api/v1/workspace"
}
```

**File**: `internal/cmd/commands/server/server.go` updates

```go
// Initialize search provider
var searchProvider search.Provider
switch cfg.Search.Provider {
case "meilisearch":
	searchProvider, err = meilisearch.NewAdapter(&meilisearch.Config{
		Host:            cfg.Search.Meilisearch.Host,
		APIKey:          cfg.Search.Meilisearch.APIKey,
		DocsIndexName:   cfg.Search.Meilisearch.DocsIndex,
		DraftsIndexName: cfg.Search.Meilisearch.DraftsIndex,
	})
case "algolia":
	searchProvider, err = algolia.NewAdapter(&algolia.Config{
		AppID:           cfg.Search.Algolia.AppID,
		SearchAPIKey:    cfg.Search.Algolia.SearchAPIKey,
		WriteAPIKey:     cfg.Search.Algolia.WriteAPIKey,
		DocsIndexName:   cfg.Search.Algolia.DocsIndex,
		DraftsIndexName: cfg.Search.Algolia.DraftsIndex,
	})
default:
	return fmt.Errorf("unknown search provider: %s", cfg.Search.Provider)
}

// Initialize workspace API if enabled
if cfg.Workspace.Enabled {
	workspaceHandler := workspace.NewHandler(storageProvider, searchProvider, db, logger)
	router.Mount(cfg.Workspace.Prefix, workspaceHandler.Routes())
}
```

## Phase 4: Integration Tests (Week 5-6)

### 4.1 Search Adapter Integration Tests

**File**: `pkg/search/adapters/integration_test.go`

```go
// +build integration

package adapters_test

import (
	"context"
	"testing"
	"time"
	
	"github.com/hashicorp-forge/hermes/pkg/search"
	"github.com/hashicorp-forge/hermes/pkg/search/adapters/algolia"
	"github.com/hashicorp-forge/hermes/pkg/search/adapters/meilisearch"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// AdapterTestSuite runs standard tests against any search adapter.
type AdapterTestSuite struct {
	Provider search.Provider
	T        *testing.T
}

func (s *AdapterTestSuite) RunAllTests() {
	s.T.Run("Health", s.TestHealth)
	s.T.Run("IndexDocument", s.TestIndexDocument)
	s.T.Run("IndexBatch", s.TestIndexBatch)
	s.T.Run("Search", s.TestSearch)
	s.T.Run("SearchWithFilters", s.TestSearchWithFilters)
	s.T.Run("SearchWithFacets", s.TestSearchWithFacets)
	s.T.Run("DeleteDocument", s.TestDeleteDocument)
}

func (s *AdapterTestSuite) TestIndexDocument() {
	ctx := context.Background()
	docIdx := s.Provider.DocumentIndex()
	
	doc := &search.Document{
		ObjectID:    "test-doc-1",
		DocID:       "doc-001",
		Title:       "Test RFC Document",
		DocNumber:   "RFC-001",
		DocType:     "RFC",
		Product:     "Terraform",
		Status:      "approved",
		Owners:      []string{"engineer@hashicorp.com"},
		Summary:     "This is a test document for search",
		Content:     "Full content of the test document with searchable text",
		CreatedTime: time.Now().Unix(),
		ModifiedTime: time.Now().Unix(),
	}
	
	err := docIdx.Index(ctx, doc)
	require.NoError(s.T, err)
	
	// Wait for indexing (implementation-specific delay)
	time.Sleep(1 * time.Second)
	
	// Verify document is searchable
	result, err := docIdx.Search(ctx, &search.SearchQuery{
		Query:   "test RFC",
		Page:    0,
		PerPage: 10,
	})
	require.NoError(s.T, err)
	assert.Greater(s.T, result.TotalHits, 0)
	
	found := false
	for _, hit := range result.Hits {
		if hit.ObjectID == "test-doc-1" {
			found = true
			assert.Equal(s.T, "Test RFC Document", hit.Title)
			break
		}
	}
	assert.True(s.T, found, "Document should be found in search results")
}

func (s *AdapterTestSuite) TestSearchWithFilters() {
	ctx := context.Background()
	docIdx := s.Provider.DocumentIndex()
	
	// Index test documents
	docs := []*search.Document{
		{
			ObjectID: "tf-doc-1",
			Title:    "Terraform RFC",
			Product:  "Terraform",
			Status:   "approved",
		},
		{
			ObjectID: "vault-doc-1",
			Title:    "Vault RFC",
			Product:  "Vault",
			Status:   "draft",
		},
	}
	
	err := docIdx.IndexBatch(ctx, docs)
	require.NoError(s.T, err)
	time.Sleep(1 * time.Second)
	
	// Search with filter
	result, err := docIdx.Search(ctx, &search.SearchQuery{
		Query: "RFC",
		Filters: map[string][]string{
			"product": {"Terraform"},
		},
		Page:    0,
		PerPage: 10,
	})
	require.NoError(s.T, err)
	
	// Should only return Terraform document
	assert.Equal(s.T, 1, result.TotalHits)
	assert.Equal(s.T, "tf-doc-1", result.Hits[0].ObjectID)
}

// Test with Meilisearch
func TestMeilisearchAdapter(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping Meilisearch integration test")
	}
	
	adapter, err := meilisearch.NewAdapter(&meilisearch.Config{
		Host:            "http://localhost:7700",
		APIKey:          "masterKey123",
		DocsIndexName:   "test-documents",
		DraftsIndexName: "test-drafts",
	})
	require.NoError(t, err)
	
	// Clear indexes before testing
	ctx := context.Background()
	adapter.DocumentIndex().Clear(ctx)
	adapter.DraftIndex().Clear(ctx)
	
	suite := &AdapterTestSuite{
		Provider: adapter,
		T:        t,
	}
	suite.RunAllTests()
}

// Test with Algolia (only if credentials available)
func TestAlgoliaAdapter(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping Algolia integration test")
	}
	
	// Only run if env vars set
	appID := os.Getenv("ALGOLIA_APP_ID")
	apiKey := os.Getenv("ALGOLIA_API_KEY")
	if appID == "" || apiKey == "" {
		t.Skip("Algolia credentials not available")
	}
	
	adapter, err := algolia.NewAdapter(&algolia.Config{
		AppID:           appID,
		WriteAPIKey:     apiKey,
		DocsIndexName:   "test-documents",
		DraftsIndexName: "test-drafts",
	})
	require.NoError(t, err)
	
	suite := &AdapterTestSuite{
		Provider: adapter,
		T:        t,
	}
	suite.RunAllTests()
}
```

### 4.2 Full Stack Integration Test

**File**: `tests/integration/workspace_api_test.go`

```go
// +build integration

package integration_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
	
	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/internal/server"
	"github.com/hashicorp-forge/hermes/pkg/search/adapters/meilisearch"
	"github.com/hashicorp-forge/hermes/pkg/storage/adapters/localworkspace"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestWorkspaceAPIFullStack tests the complete workflow:
// 1. Start services (PostgreSQL, Meilisearch via docker-compose)
// 2. Create document via API
// 3. Verify document is indexed
// 4. Search for document
// 5. Update document
// 6. Delete document
func TestWorkspaceAPIFullStack(t *testing.T) {
	// Setup test environment
	cfg := &config.Config{
		Storage: config.StorageConfig{
			Provider: "localworkspace",
			LocalWorkspace: config.LocalWorkspaceConfig{
				BasePath: t.TempDir(),
			},
		},
		Search: config.SearchConfig{
			Provider: "meilisearch",
			Meilisearch: config.MeilisearchConfig{
				Host:          "http://localhost:7700",
				APIKey:        "masterKey123",
				DocsIndex:     "test-docs",
				DraftsIndex:   "test-drafts",
			},
		},
	}
	
	// Initialize storage
	storage, err := localworkspace.NewAdapter(&localworkspace.Config{
		BasePath: cfg.Storage.LocalWorkspace.BasePath,
	})
	require.NoError(t, err)
	
	// Initialize search
	search, err := meilisearch.NewAdapter(&meilisearch.Config{
		Host:            cfg.Search.Meilisearch.Host,
		APIKey:          cfg.Search.Meilisearch.APIKey,
		DocsIndexName:   cfg.Search.Meilisearch.DocsIndex,
		DraftsIndexName: cfg.Search.Meilisearch.DraftsIndex,
	})
	require.NoError(t, err)
	
	// Clear search index
	search.DocumentIndex().Clear(context.Background())
	
	// Initialize test database
	db := setupTestDatabase(t)
	
	// Create server
	srv := server.New(cfg, db, storage, search)
	testServer := httptest.NewServer(srv)
	defer testServer.Close()
	
	// Test 1: Create document
	t.Run("CreateDocument", func(t *testing.T) {
		body := map[string]interface{}{
			"name":    "RFC-001: Test Document",
			"content": "This is test content for searching",
			"docType": "RFC",
			"product": "Terraform",
			"status":  "draft",
			"owner":   "test@example.com",
		}
		
		resp, err := postJSON(testServer.URL+"/api/v1/workspace/documents", body)
		require.NoError(t, err)
		defer resp.Body.Close()
		
		assert.Equal(t, http.StatusCreated, resp.StatusCode)
		
		var result map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&result)
		
		docID := result["id"].(string)
		assert.NotEmpty(t, docID)
		
		// Store for later tests
		t.Cleanup(func() {
			// Cleanup document
		})
	})
	
	// Test 2: Wait for indexing and search
	t.Run("SearchDocument", func(t *testing.T) {
		// Wait for indexing
		time.Sleep(2 * time.Second)
		
		resp, err := http.Get(testServer.URL + "/api/v1/workspace/search?q=test+content")
		require.NoError(t, err)
		defer resp.Body.Close()
		
		assert.Equal(t, http.StatusOK, resp.StatusCode)
		
		var result map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&result)
		
		hits := result["hits"].([]interface{})
		assert.Greater(t, len(hits), 0, "Should find the created document")
	})
	
	// Test 3: Filter search
	t.Run("SearchWithFilter", func(t *testing.T) {
		resp, err := http.Get(testServer.URL + "/api/v1/workspace/search?q=test&product=Terraform")
		require.NoError(t, err)
		defer resp.Body.Close()
		
		var result map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&result)
		
		// Verify filtered results
		hits := result["hits"].([]interface{})
		for _, hit := range hits {
			doc := hit.(map[string]interface{})
			assert.Equal(t, "Terraform", doc["product"])
		}
	})
}

// Helper functions
func postJSON(url string, body interface{}) (*http.Response, error) {
	data, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}
	return http.Post(url, "application/json", bytes.NewReader(data))
}
```

**Makefile additions:**

```makefile
.PHONY: test/integration
test/integration: docker/dev/start
	@echo "Running integration tests..."
	@sleep 2  # Wait for services
	go test -v -tags=integration ./tests/integration/... -timeout=5m
	@make docker/dev/stop

.PHONY: test/integration/watch
test/integration/watch:
	@echo "Running integration tests in watch mode..."
	docker-compose up -d
	@watchexec -e go "make test/integration"
```

## Phase 5: Documentation & Migration (Week 7-8)

### 5.1 Documentation Updates

**Files to create/update:**
- [ ] `docs/SEARCH_ABSTRACTION.md` - Architecture overview
- [ ] `docs/LOCAL_DEVELOPMENT.md` - Setup guide with Meilisearch
- [ ] `docs/SEARCH_MIGRATION.md` - Migration from Algolia
- [ ] `pkg/search/README.md` - Search abstraction usage guide
- [ ] `pkg/search/adapters/README.md` - Adapter development guide
- [ ] API documentation for workspace endpoints
- [ ] Update `.env.template` with search configuration
- [ ] Update `ENV_SETUP.md` with Meilisearch setup

### 5.2 Migration Tasks

- [ ] Update CI/CD to run integration tests
- [ ] Add Meilisearch to CI docker-compose
- [ ] Update deployment docs for search provider choice
- [ ] Create migration scripts for existing Algolia data (if needed)
- [ ] Add feature flag for gradual rollout
- [ ] Performance benchmarks (Algolia vs Meilisearch)

## Success Criteria

### Functional Requirements
- [ ] All search operations work with both Algolia and Meilisearch
- [ ] Workspace API provides full CRUD operations
- [ ] Search results are consistent across adapters
- [ ] Faceted search works correctly
- [ ] Filtering and sorting work as expected
- [ ] Local development requires no external credentials

### Non-Functional Requirements
- [ ] Search performance <500ms for typical queries
- [ ] Integration tests run in <5 minutes
- [ ] 100% feature parity between adapters
- [ ] Zero breaking changes to existing API
- [ ] Comprehensive documentation
- [ ] Easy to add new search adapters

## Testing Strategy

### Unit Tests
- [ ] Search interface implementations
- [ ] Filter/facet conversion logic
- [ ] Error handling
- [ ] Query building

### Integration Tests
- [ ] Search adapter compliance tests
- [ ] Workspace API endpoint tests
- [ ] Full stack workflow tests
- [ ] Docker-compose environment tests

### Performance Tests
- [ ] Index 10k documents benchmark
- [ ] Search query latency
- [ ] Concurrent search load
- [ ] Memory usage

## Configuration Examples

### Development (Meilisearch + LocalWorkspace)
```hcl
storage {
  provider = "localworkspace"
  localworkspace {
    base_path = "./storage"
  }
}

search {
  provider = "meilisearch"
  meilisearch {
    host = "http://localhost:7700"
    api_key = "masterKey123"
    docs_index = "hermes-documents"
    drafts_index = "hermes-drafts"
  }
}

workspace {
  enabled = true
  prefix = "/api/v1/workspace"
}
```

### Production (Google + Algolia)
```hcl
storage {
  provider = "google"
  google {
    # Google Workspace config
  }
}

search {
  provider = "algolia"
  algolia {
    app_id = "${ALGOLIA_APP_ID}"
    search_api_key = "${ALGOLIA_SEARCH_API_KEY}"
    write_api_key = "${ALGOLIA_WRITE_API_KEY}"
    docs_index = "prod-documents"
    drafts_index = "prod-drafts"
  }
}

workspace {
  enabled = false  # Disable in production
}
```

## Rollout Plan

### Phase 1: Internal Testing (Week 1-2)
- Deploy with Meilisearch in staging
- Team testing
- Performance validation
- Bug fixes

### Phase 2: Beta (Week 3-4)
- Feature flag for 10% of requests
- Monitor metrics
- Gather feedback
- Compare with Algolia

### Phase 3: Gradual Rollout (Week 5-6)
- Increase to 50%
- Monitor costs and performance
- Address issues

### Phase 4: Full Deployment (Week 7-8)
- 100% on new adapter
- Keep Algolia as fallback
- Document lessons learned

## Cost Analysis

### Current (Algolia only)
- Monthly cost: $X
- Scales with usage
- External dependency

### Future (Meilisearch option)
- Self-hosted infrastructure: $Y
- Fixed cost regardless of usage
- Internal control
- Requires maintenance

### Break-even Analysis
- Calculate based on query volume
- Consider team size for maintenance
- Factor in reliability requirements

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Search quality differences | High | Extensive testing, tune relevance |
| Performance regression | High | Benchmarks, monitoring |
| Feature parity gaps | Medium | Comprehensive test suite |
| Migration complexity | Medium | Phased rollout, feature flags |
| Meilisearch scaling | Medium | Load testing, monitoring |
| Team unfamiliarity | Low | Documentation, training |

## Related Work

- **TODO_API_STORAGE_MIGRATION.md** - Storage abstraction pattern
- **TODO_UNIT_TESTS.md** - Test coverage expansion
- **TODO_API_TEST_SUITE.md** - API testing framework
- **TODO_INTEGRATION_TESTS.md** - Integration test patterns

## Future Enhancements

### Phase 6+
- [ ] Elasticsearch adapter
- [ ] Typesense adapter
- [ ] Advanced search features (fuzzy, phrase, proximity)
- [ ] Search analytics dashboard
- [ ] A/B testing framework
- [ ] Multi-language support
- [ ] Autocomplete/suggestions
- [ ] Semantic search with embeddings
- [ ] Search query logging and analysis
- [ ] Custom ranking algorithms

## Notes

- Meilisearch is Rust-based, fast, and easy to deploy
- Consider using Meilisearch Cloud for production if self-hosting is complex
- Keep Algolia as option for teams that prefer managed service
- Search abstraction enables experimentation with AI-powered search
- Workspace API valuable for frontend teams building local-first features
- Pattern can extend to other services (email, notifications, etc.)
