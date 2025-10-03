# TODO: Search Abstraction & Local Workspace API

**Status**: Phase 1 Complete ✅ (October 2, 2025)  
**Priority**: High  
**Effort**: Large (6-8 weeks)  
**Dependencies**: 
- TODO_API_STORAGE_MIGRATION.md (storage abstraction provides pattern)
- Meilisearch Docker setup
- Local workspace adapter working

**Implementation Summary**: See [SEARCH_ABSTRACTION_IMPLEMENTATION.md](./SEARCH_ABSTRACTION_IMPLEMENTATION.md)

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
- [x] Create `pkg/search/` package structure ✅
- [x] Define `Provider` interface ✅
- [x] Define `DocumentIndex` and `DraftIndex` interfaces ✅
- [x] Define data types (`Document`, `SearchQuery`, `SearchResult`, `Facets`) ✅
- [x] Define error types ✅
- [x] Create Algolia adapter in `pkg/search/adapters/algolia/` ✅
- [ ] Migrate existing `pkg/algolia/` code to new adapter (In Progress 🚧)
- [x] Add unit tests for interfaces ✅
- [x] Add comprehensive documentation and examples ✅

**Phase 1 Status**: Core abstraction complete. Basic CRUD operations working. Search and GetFacets methods need full implementation.
- [ ] Add integration tests for Algolia adapter
