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

	// ProjectIndex returns the project search interface.
	ProjectIndex() ProjectIndex

	// LinksIndex returns the links/redirect search interface.
	LinksIndex() LinksIndex

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

	// GetObject retrieves a single document by ID from the search index.
	// This is used for data consistency checks between database and search index.
	GetObject(ctx context.Context, docID string) (*Document, error)

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

	// GetObject retrieves a single draft document by ID from the search index.
	// This is used for data consistency checks between database and search index.
	GetObject(ctx context.Context, docID string) (*Document, error)

	// GetFacets retrieves available facets for filtering drafts.
	GetFacets(ctx context.Context, facetNames []string) (*Facets, error)

	// Clear removes all draft documents from the index (use with caution).
	Clear(ctx context.Context) error
}

// ProjectIndex handles project search operations.
type ProjectIndex interface {
	// Index adds or updates a project in the search index.
	// The project map should contain fields like: objectID, title, description,
	// status, creator, createdTime, modifiedTime, jiraIssueID, etc.
	Index(ctx context.Context, project map[string]any) error

	// Delete removes a project from the search index.
	Delete(ctx context.Context, projectID string) error

	// Search performs a search query on projects.
	Search(ctx context.Context, query *SearchQuery) (*SearchResult, error)

	// GetObject retrieves a single project by ID from the search index.
	GetObject(ctx context.Context, projectID string) (map[string]any, error)

	// Clear removes all projects from the index (use with caution).
	Clear(ctx context.Context) error
}

// LinksIndex handles document redirect/short-link operations.
type LinksIndex interface {
	// SaveLink saves a document redirect link.
	// The link map should contain: objectID (e.g., "/rfc/lab-001") and documentID (Google Drive file ID).
	SaveLink(ctx context.Context, link map[string]string) error

	// DeleteLink removes a document redirect link.
	DeleteLink(ctx context.Context, objectID string) error

	// GetLink retrieves a redirect link by its objectID.
	GetLink(ctx context.Context, objectID string) (map[string]string, error)

	// Clear removes all links from the index (use with caution).
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

// FilterOperator defines logical operators for filter composition.
type FilterOperator string

const (
	FilterOperatorAND FilterOperator = "AND"
	FilterOperatorOR  FilterOperator = "OR"
)

// FilterGroup represents a group of filters with a logical operator.
type FilterGroup struct {
	Operator FilterOperator
	Filters  []string // Filter expressions like "owners:user@example.com"
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

	// FilterGroups enables complex filter logic with AND/OR operators.
	// Example: OR group for (owners:user@example.com OR contributors:user@example.com)
	FilterGroups []FilterGroup

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
