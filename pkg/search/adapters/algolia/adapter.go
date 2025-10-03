package algolia

import (
	"context"
	"fmt"

	"github.com/algolia/algoliasearch-client-go/v3/algolia/search"
	hermessearch "github.com/hashicorp-forge/hermes/pkg/search"
)

// Adapter implements search.Provider for Algolia.
type Adapter struct {
	client      *search.Client
	docsIndex   *search.Index
	draftsIndex *search.Index
	appID       string
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
func (a *Adapter) DocumentIndex() hermessearch.DocumentIndex {
	return &documentIndex{
		index: a.docsIndex,
	}
}

// DraftIndex returns the draft search interface.
func (a *Adapter) DraftIndex() hermessearch.DraftIndex {
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
		return &hermessearch.Error{
			Op:  "Healthy",
			Err: hermessearch.ErrBackendUnavailable,
			Msg: fmt.Sprintf("algolia health check failed: %v", err),
		}
	}
	return nil
}

// documentIndex implements search.DocumentIndex.
type documentIndex struct {
	index *search.Index
}

func (di *documentIndex) Index(ctx context.Context, doc *hermessearch.Document) error {
	_, err := di.index.SaveObject(doc)
	if err != nil {
		return &hermessearch.Error{
			Op:  "Index",
			Err: hermessearch.ErrIndexingFailed,
			Msg: err.Error(),
		}
	}
	return nil
}

func (di *documentIndex) IndexBatch(ctx context.Context, docs []*hermessearch.Document) error {
	objects := make([]interface{}, len(docs))
	for i, doc := range docs {
		objects[i] = doc
	}

	_, err := di.index.SaveObjects(objects)
	if err != nil {
		return &hermessearch.Error{
			Op:  "IndexBatch",
			Err: hermessearch.ErrIndexingFailed,
			Msg: err.Error(),
		}
	}
	return nil
}

func (di *documentIndex) Delete(ctx context.Context, docID string) error {
	_, err := di.index.DeleteObject(docID)
	if err != nil {
		return &hermessearch.Error{
			Op:  "Delete",
			Err: hermessearch.ErrNotFound,
			Msg: err.Error(),
		}
	}
	return nil
}

func (di *documentIndex) DeleteBatch(ctx context.Context, docIDs []string) error {
	_, err := di.index.DeleteObjects(docIDs)
	if err != nil {
		return &hermessearch.Error{
			Op:  "DeleteBatch",
			Err: hermessearch.ErrIndexingFailed,
			Msg: err.Error(),
		}
	}
	return nil
}

func (di *documentIndex) Search(ctx context.Context, query *hermessearch.SearchQuery) (*hermessearch.SearchResult, error) {
	// TODO: Implement full search with query parameters
	// This is a placeholder that needs to be expanded to handle:
	// - Pagination
	// - Filters
	// - Facets
	// - Sorting
	// - Highlighting
	return nil, fmt.Errorf("Search not yet implemented")
}

func (di *documentIndex) GetFacets(ctx context.Context, facetNames []string) (*hermessearch.Facets, error) {
	// TODO: Implement facet retrieval
	return nil, fmt.Errorf("GetFacets not yet implemented")
}

func (di *documentIndex) Clear(ctx context.Context) error {
	_, err := di.index.ClearObjects()
	if err != nil {
		return &hermessearch.Error{
			Op:  "Clear",
			Err: hermessearch.ErrIndexingFailed,
			Msg: err.Error(),
		}
	}
	return nil
}

// draftIndex implements search.DraftIndex.
type draftIndex struct {
	index *search.Index
}

func (dri *draftIndex) Index(ctx context.Context, doc *hermessearch.Document) error {
	_, err := dri.index.SaveObject(doc)
	if err != nil {
		return &hermessearch.Error{
			Op:  "Index",
			Err: hermessearch.ErrIndexingFailed,
			Msg: err.Error(),
		}
	}
	return nil
}

func (dri *draftIndex) IndexBatch(ctx context.Context, docs []*hermessearch.Document) error {
	objects := make([]interface{}, len(docs))
	for i, doc := range docs {
		objects[i] = doc
	}

	_, err := dri.index.SaveObjects(objects)
	if err != nil {
		return &hermessearch.Error{
			Op:  "IndexBatch",
			Err: hermessearch.ErrIndexingFailed,
			Msg: err.Error(),
		}
	}
	return nil
}

func (dri *draftIndex) Delete(ctx context.Context, docID string) error {
	_, err := dri.index.DeleteObject(docID)
	if err != nil {
		return &hermessearch.Error{
			Op:  "Delete",
			Err: hermessearch.ErrNotFound,
			Msg: err.Error(),
		}
	}
	return nil
}

func (dri *draftIndex) DeleteBatch(ctx context.Context, docIDs []string) error {
	_, err := dri.index.DeleteObjects(docIDs)
	if err != nil {
		return &hermessearch.Error{
			Op:  "DeleteBatch",
			Err: hermessearch.ErrIndexingFailed,
			Msg: err.Error(),
		}
	}
	return nil
}

func (dri *draftIndex) Search(ctx context.Context, query *hermessearch.SearchQuery) (*hermessearch.SearchResult, error) {
	// TODO: Implement full search with query parameters
	return nil, fmt.Errorf("Search not yet implemented")
}

func (dri *draftIndex) GetFacets(ctx context.Context, facetNames []string) (*hermessearch.Facets, error) {
	// TODO: Implement facet retrieval
	return nil, fmt.Errorf("GetFacets not yet implemented")
}

func (dri *draftIndex) Clear(ctx context.Context) error {
	_, err := dri.index.ClearObjects()
	if err != nil {
		return &hermessearch.Error{
			Op:  "Clear",
			Err: hermessearch.ErrIndexingFailed,
			Msg: err.Error(),
		}
	}
	return nil
}
