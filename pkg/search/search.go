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
	// Index adds or updates a draft document in the search index.
	Index(ctx context.Context, doc *Document) error

	// IndexBatch adds or updates multiple draft documents.
	IndexBatch(ctx context.Context, docs []*Document) error

	// Delete removes a draft document from the search index.
	Delete(ctx context.Context, docID string) error

	// DeleteBatch removes multiple draft documents.
	DeleteBatch(ctx context.Context, docIDs []string) error

	// Search performs a search query on drafts.
	Search(ctx context.Context, query *SearchQuery) (*SearchResult, error)

	// GetFacets retrieves available facets for filtering drafts.
	GetFacets(ctx context.Context, facetNames []string) (*Facets, error)

	// Clear removes all draft documents from the index (use with caution).
	Clear(ctx context.Context) error
}

// Document represents a searchable document.
type Document struct {
	ObjectID     string                 `json:"objectID"`
	DocID        string                 `json:"docID"`
	Title        string                 `json:"title"`
	DocNumber    string                 `json:"docNumber"`
	DocType      string                 `json:"docType"`
	Product      string                 `json:"product"`
	Status       string                 `json:"status"`
	Owners       []string               `json:"owners"`
	Contributors []string               `json:"contributors"`
	Approvers    []string               `json:"approvers"`
	Summary      string                 `json:"summary"`
	Content      string                 `json:"content"`
	CreatedTime  int64                  `json:"createdTime"`
	ModifiedTime int64                  `json:"modifiedTime"`
	CustomFields map[string]interface{} `json:"customFields,omitempty"`

	// Timestamps for internal use
	IndexedAt time.Time `json:"-"`
}

// SearchQuery defines search parameters.
type SearchQuery struct {
	// Query text
	Query string

	// Pagination
	Page    int
	PerPage int

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
	Products map[string]int `json:"products"`
	DocTypes map[string]int `json:"docTypes"`
	Statuses map[string]int `json:"statuses"`
	Owners   map[string]int `json:"owners"`
}
