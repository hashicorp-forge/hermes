package algolia

import (
	"context"
	"fmt"

	"github.com/algolia/algoliasearch-client-go/v3/algolia/search"
	hermessearch "github.com/hashicorp-forge/hermes/pkg/search"
)

// Adapter implements search.Provider for Algolia.
type Adapter struct {
	client        *search.Client
	docsIndex     *search.Index
	draftsIndex   *search.Index
	projectsIndex *search.Index
	linksIndex    *search.Index
	appID         string
}

// Config contains Algolia configuration.
type Config struct {
	AppID                  string `hcl:"application_id,optional"`
	SearchAPIKey           string `hcl:"search_api_key,optional"`
	WriteAPIKey            string `hcl:"write_api_key,optional"`
	DocsIndexName          string `hcl:"docs_index_name,optional"`
	DraftsIndexName        string `hcl:"drafts_index_name,optional"`
	InternalIndexName      string `hcl:"internal_index_name,optional"`
	LinksIndexName         string `hcl:"links_index_name,optional"`
	MissingFieldsIndexName string `hcl:"missing_fields_index_name,optional"`
	ProjectsIndexName      string `hcl:"projects_index_name,optional"`
}

// NewAdapter creates a new Algolia search adapter.
func NewAdapter(cfg *Config) (*Adapter, error) {
	if cfg.AppID == "" || cfg.WriteAPIKey == "" {
		return nil, fmt.Errorf("algolia credentials required")
	}

	client := search.NewClient(cfg.AppID, cfg.WriteAPIKey)

	return &Adapter{
		client:        client,
		docsIndex:     client.InitIndex(cfg.DocsIndexName),
		draftsIndex:   client.InitIndex(cfg.DraftsIndexName),
		projectsIndex: client.InitIndex(cfg.ProjectsIndexName),
		linksIndex:    client.InitIndex(cfg.LinksIndexName),
		appID:         cfg.AppID,
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

// ProjectIndex returns the project search interface.
func (a *Adapter) ProjectIndex() hermessearch.ProjectIndex {
	return &projectIndex{
		index: a.projectsIndex,
	}
}

// LinksIndex returns the links/redirect search interface.
func (a *Adapter) LinksIndex() hermessearch.LinksIndex {
	return &linksIndex{
		index: a.linksIndex,
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

func (di *documentIndex) GetObject(ctx context.Context, docID string) (*hermessearch.Document, error) {
	var doc hermessearch.Document
	err := di.index.GetObject(docID, &doc)
	if err != nil {
		return nil, &hermessearch.Error{
			Op:  "GetObject",
			Err: hermessearch.ErrNotFound,
			Msg: err.Error(),
		}
	}
	return &doc, nil
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

func (dri *draftIndex) GetObject(ctx context.Context, docID string) (*hermessearch.Document, error) {
	var doc hermessearch.Document
	err := dri.index.GetObject(docID, &doc)
	if err != nil {
		return nil, &hermessearch.Error{
			Op:  "GetObject",
			Err: hermessearch.ErrNotFound,
			Msg: err.Error(),
		}
	}
	return &doc, nil
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

// projectIndex implements search.ProjectIndex.
type projectIndex struct {
	index *search.Index
}

func (pi *projectIndex) Index(ctx context.Context, project map[string]any) error {
	_, err := pi.index.SaveObject(project)
	if err != nil {
		return &hermessearch.Error{
			Op:  "Index",
			Err: hermessearch.ErrIndexingFailed,
			Msg: err.Error(),
		}
	}
	return nil
}

func (pi *projectIndex) Delete(ctx context.Context, projectID string) error {
	_, err := pi.index.DeleteObject(projectID)
	if err != nil {
		return &hermessearch.Error{
			Op:  "Delete",
			Err: hermessearch.ErrNotFound,
			Msg: err.Error(),
		}
	}
	return nil
}

func (pi *projectIndex) Search(ctx context.Context, query *hermessearch.SearchQuery) (*hermessearch.SearchResult, error) {
	// TODO: Implement full search with query parameters
	return nil, fmt.Errorf("Search not yet implemented")
}

func (pi *projectIndex) GetObject(ctx context.Context, projectID string) (map[string]any, error) {
	var project map[string]any
	err := pi.index.GetObject(projectID, &project)
	if err != nil {
		return nil, &hermessearch.Error{
			Op:  "GetObject",
			Err: hermessearch.ErrNotFound,
			Msg: err.Error(),
		}
	}
	return project, nil
}

func (pi *projectIndex) Clear(ctx context.Context) error {
	_, err := pi.index.ClearObjects()
	if err != nil {
		return &hermessearch.Error{
			Op:  "Clear",
			Err: hermessearch.ErrIndexingFailed,
			Msg: err.Error(),
		}
	}
	return nil
}

// linksIndex implements search.LinksIndex.
type linksIndex struct {
	index *search.Index
}

func (li *linksIndex) SaveLink(ctx context.Context, link map[string]string) error {
	_, err := li.index.SaveObject(link)
	if err != nil {
		return &hermessearch.Error{
			Op:  "SaveLink",
			Err: hermessearch.ErrIndexingFailed,
			Msg: err.Error(),
		}
	}
	return nil
}

func (li *linksIndex) DeleteLink(ctx context.Context, objectID string) error {
	_, err := li.index.DeleteObject(objectID)
	if err != nil {
		return &hermessearch.Error{
			Op:  "DeleteLink",
			Err: hermessearch.ErrNotFound,
			Msg: err.Error(),
		}
	}
	return nil
}

func (li *linksIndex) GetLink(ctx context.Context, objectID string) (map[string]string, error) {
	var link map[string]string
	err := li.index.GetObject(objectID, &link)
	if err != nil {
		return nil, &hermessearch.Error{
			Op:  "GetLink",
			Err: hermessearch.ErrNotFound,
			Msg: err.Error(),
		}
	}
	return link, nil
}

func (li *linksIndex) Clear(ctx context.Context) error {
	_, err := li.index.ClearObjects()
	if err != nil {
		return &hermessearch.Error{
			Op:  "Clear",
			Err: hermessearch.ErrIndexingFailed,
			Msg: err.Error(),
		}
	}
	return nil
}
