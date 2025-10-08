package meilisearch

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/meilisearch/meilisearch-go"

	hermessearch "github.com/hashicorp-forge/hermes/pkg/search"
)

// Adapter implements search.Provider for Meilisearch.
type Adapter struct {
	client        meilisearch.ServiceManager
	docsIndex     string
	draftsIndex   string
	projectsIndex string
	linksIndex    string
}

// Config contains Meilisearch configuration.
type Config struct {
	Host              string // e.g., "http://localhost:7700"
	APIKey            string // Master key
	DocsIndexName     string
	DraftsIndexName   string
	ProjectsIndexName string
	LinksIndexName    string
}

// NewAdapter creates a new Meilisearch search adapter.
func NewAdapter(cfg *Config) (*Adapter, error) {
	if cfg.Host == "" {
		return nil, fmt.Errorf("meilisearch host required")
	}

	client := meilisearch.New(cfg.Host, meilisearch.WithAPIKey(cfg.APIKey))

	adapter := &Adapter{
		client:        client,
		docsIndex:     cfg.DocsIndexName,
		draftsIndex:   cfg.DraftsIndexName,
		projectsIndex: cfg.ProjectsIndexName,
		linksIndex:    cfg.LinksIndexName,
	}

	// Initialize indexes with settings
	if err := adapter.initializeIndexes(context.Background()); err != nil {
		return nil, fmt.Errorf("failed to initialize indexes: %w", err)
	}

	return adapter, nil
}

// initializeIndexes sets up index configuration.
func (a *Adapter) initializeIndexes(ctx context.Context) error {
	// Create documents index if it doesn't exist
	if _, err := a.client.CreateIndexWithContext(ctx, &meilisearch.IndexConfig{
		Uid:        a.docsIndex,
		PrimaryKey: "objectID",
	}); err != nil {
		// Ignore error if index already exists
		if !strings.Contains(err.Error(), "already exists") {
			return fmt.Errorf("failed to create docs index: %w", err)
		}
	}

	// Create drafts index if it doesn't exist
	if _, err := a.client.CreateIndexWithContext(ctx, &meilisearch.IndexConfig{
		Uid:        a.draftsIndex,
		PrimaryKey: "objectID",
	}); err != nil {
		// Ignore error if index already exists
		if !strings.Contains(err.Error(), "already exists") {
			return fmt.Errorf("failed to create drafts index: %w", err)
		}
	}

	// Configure documents index
	docsIdx := a.client.Index(a.docsIndex)

	// Configure searchable attributes
	searchableAttrs := []string{"title", "docNumber", "summary", "content", "owners", "contributors"}
	if _, err := docsIdx.UpdateSearchableAttributesWithContext(ctx, &searchableAttrs); err != nil {
		return fmt.Errorf("failed to update searchable attributes: %w", err)
	}

	// Configure filterable attributes
	// Include all attributes that might be used in queries by the API handlers
	filterableAttrs := []interface{}{
		"product", "docType", "status",
		"owners", "contributors", "approvers",
		"createdTime", "modifiedTime",
		"appCreated", "approvedBy", // Used by approval workflow queries
	}
	if _, err := docsIdx.UpdateFilterableAttributesWithContext(ctx, &filterableAttrs); err != nil {
		return fmt.Errorf("failed to update filterable attributes: %w", err)
	}

	// Configure sortable attributes
	sortableAttrs := []string{"createdTime", "modifiedTime", "title"}
	if _, err := docsIdx.UpdateSortableAttributesWithContext(ctx, &sortableAttrs); err != nil {
		return fmt.Errorf("failed to update sortable attributes: %w", err)
	}

	// Configure the same for drafts index
	draftsIdx := a.client.Index(a.draftsIndex)

	if _, err := draftsIdx.UpdateSearchableAttributesWithContext(ctx, &searchableAttrs); err != nil {
		return fmt.Errorf("failed to update drafts searchable attributes: %w", err)
	}

	if _, err := draftsIdx.UpdateFilterableAttributesWithContext(ctx, &filterableAttrs); err != nil {
		return fmt.Errorf("failed to update drafts filterable attributes: %w", err)
	}

	if _, err := draftsIdx.UpdateSortableAttributesWithContext(ctx, &sortableAttrs); err != nil {
		return fmt.Errorf("failed to update drafts sortable attributes: %w", err)
	}

	return nil
}

// DocumentIndex returns the document search interface.
func (a *Adapter) DocumentIndex() hermessearch.DocumentIndex {
	return &documentIndex{
		client: a.client,
		index:  a.docsIndex,
	}
}

// DraftIndex returns the draft search interface.
func (a *Adapter) DraftIndex() hermessearch.DraftIndex {
	return &draftIndex{
		client: a.client,
		index:  a.draftsIndex,
	}
}

// ProjectIndex returns the project search interface.
func (a *Adapter) ProjectIndex() hermessearch.ProjectIndex {
	return &projectIndex{
		client: a.client,
		index:  a.projectsIndex,
	}
}

// LinksIndex returns the links/redirect search interface.
func (a *Adapter) LinksIndex() hermessearch.LinksIndex {
	return &linksIndex{
		client: a.client,
		index:  a.linksIndex,
	}
}

// Name returns the provider name.
func (a *Adapter) Name() string {
	return "meilisearch"
}

// Healthy checks if Meilisearch is accessible.
func (a *Adapter) Healthy(ctx context.Context) error {
	health, err := a.client.HealthWithContext(ctx)
	if err != nil {
		return &hermessearch.Error{
			Op:  "Healthy",
			Err: hermessearch.ErrBackendUnavailable,
			Msg: fmt.Sprintf("meilisearch health check failed: %v", err),
		}
	}
	if health.Status != "available" {
		return &hermessearch.Error{
			Op:  "Healthy",
			Err: hermessearch.ErrBackendUnavailable,
			Msg: fmt.Sprintf("meilisearch status: %s", health.Status),
		}
	}
	return nil
}

// documentIndex implements search.DocumentIndex.
type documentIndex struct {
	client meilisearch.ServiceManager
	index  string
}

func (di *documentIndex) Index(ctx context.Context, doc *hermessearch.Document) error {
	idx := di.client.Index(di.index)

	primaryKey := "objectID"
	task, err := idx.AddDocumentsWithContext(ctx, []interface{}{doc}, &primaryKey)
	if err != nil {
		return &hermessearch.Error{
			Op:  "Index",
			Err: hermessearch.ErrIndexingFailed,
			Msg: err.Error(),
		}
	}

	// Wait for indexing to complete
	// Use minimum of: 2s default OR remaining context time
	waitTimeout := 2000 * time.Millisecond
	if deadline, ok := ctx.Deadline(); ok {
		remaining := time.Until(deadline)
		if remaining < waitTimeout {
			waitTimeout = remaining
		}
		if waitTimeout < 0 {
			waitTimeout = 0 // Context already expired
		}
	}
	_, err = di.client.WaitForTaskWithContext(ctx, task.TaskUID, waitTimeout)
	if err != nil {
		return &hermessearch.Error{
			Op:  "Index",
			Err: hermessearch.ErrIndexingFailed,
			Msg: fmt.Sprintf("indexing task failed: %v", err),
		}
	}

	return nil
}

func (di *documentIndex) IndexBatch(ctx context.Context, docs []*hermessearch.Document) error {
	idx := di.client.Index(di.index)

	// Convert to interface slice
	objects := make([]interface{}, len(docs))
	for i, doc := range docs {
		objects[i] = doc
	}

	primaryKey := "objectID"
	task, err := idx.AddDocumentsWithContext(ctx, objects, &primaryKey)
	if err != nil {
		return &hermessearch.Error{
			Op:  "IndexBatch",
			Err: hermessearch.ErrIndexingFailed,
			Msg: err.Error(),
		}
	}

	// Wait for batch indexing to complete
	// Use minimum of: 5s default OR remaining context time
	// This ensures we respect context cancellation while not waiting unnecessarily long
	waitTimeout := 5000 * time.Millisecond
	if deadline, ok := ctx.Deadline(); ok {
		remaining := time.Until(deadline)
		if remaining < waitTimeout {
			waitTimeout = remaining
		}
		if waitTimeout < 0 {
			waitTimeout = 0 // Context already expired
		}
	}
	_, err = di.client.WaitForTaskWithContext(ctx, task.TaskUID, waitTimeout)
	if err != nil {
		return &hermessearch.Error{
			Op:  "IndexBatch",
			Err: hermessearch.ErrIndexingFailed,
			Msg: fmt.Sprintf("batch indexing task failed: %v", err),
		}
	}

	return nil
}

func (di *documentIndex) Delete(ctx context.Context, docID string) error {
	idx := di.client.Index(di.index)

	task, err := idx.DeleteDocumentWithContext(ctx, docID)
	if err != nil {
		return &hermessearch.Error{
			Op:  "Delete",
			Err: hermessearch.ErrNotFound,
			Msg: err.Error(),
		}
	}

	// Wait for deletion to complete
	// Use minimum of: 2s default OR remaining context time
	waitTimeout := 2000 * time.Millisecond
	if deadline, ok := ctx.Deadline(); ok {
		remaining := time.Until(deadline)
		if remaining < waitTimeout {
			waitTimeout = remaining
		}
		if waitTimeout < 0 {
			waitTimeout = 0 // Context already expired
		}
	}
	_, err = di.client.WaitForTaskWithContext(ctx, task.TaskUID, waitTimeout)
	if err != nil {
		return &hermessearch.Error{
			Op:  "Delete",
			Err: hermessearch.ErrIndexingFailed,
			Msg: fmt.Sprintf("deletion task failed: %v", err),
		}
	}

	return nil
}

func (di *documentIndex) DeleteBatch(ctx context.Context, docIDs []string) error {
	idx := di.client.Index(di.index)

	task, err := idx.DeleteDocumentsWithContext(ctx, docIDs)
	if err != nil {
		return &hermessearch.Error{
			Op:  "DeleteBatch",
			Err: hermessearch.ErrIndexingFailed,
			Msg: err.Error(),
		}
	}

	// Wait for batch deletion to complete
	// Use minimum of: 5s default OR remaining context time
	waitTimeout := 5000 * time.Millisecond
	if deadline, ok := ctx.Deadline(); ok {
		remaining := time.Until(deadline)
		if remaining < waitTimeout {
			waitTimeout = remaining
		}
		if waitTimeout < 0 {
			waitTimeout = 0 // Context already expired
		}
	}
	_, err = di.client.WaitForTaskWithContext(ctx, task.TaskUID, waitTimeout)
	if err != nil {
		return &hermessearch.Error{
			Op:  "DeleteBatch",
			Err: hermessearch.ErrIndexingFailed,
			Msg: fmt.Sprintf("batch deletion task failed: %v", err),
		}
	}

	return nil
}

func (di *documentIndex) Search(ctx context.Context, query *hermessearch.SearchQuery) (*hermessearch.SearchResult, error) {
	idx := di.client.Index(di.index)

	// Build Meilisearch request
	req := &meilisearch.SearchRequest{
		Limit:  int64(query.PerPage),
		Offset: int64(query.Page * query.PerPage),
	}

	// Add filters
	if len(query.Filters) > 0 || len(query.FilterGroups) > 0 {
		filters := buildMeilisearchFilters(query.Filters)
		filterGroupsStr := buildMeilisearchFilterGroups(query.FilterGroups)

		// Combine basic filters and filter groups with AND
		if filters != nil && filterGroupsStr != "" {
			req.Filter = fmt.Sprintf("(%s) AND (%s)", filters, filterGroupsStr)
		} else if filters != nil {
			req.Filter = filters
		} else if filterGroupsStr != "" {
			req.Filter = filterGroupsStr
		}
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
	resp, err := idx.SearchWithContext(ctx, query.Query, req)
	if err != nil {
		return nil, &hermessearch.Error{
			Op:  "Search",
			Err: err,
		}
	}
	queryTime := time.Since(start)

	// Convert results
	hits := make([]*hermessearch.Document, 0, len(resp.Hits))
	for i := range resp.Hits {
		doc, err := convertMeilisearchHit(resp.Hits[i])
		if err != nil {
			continue // Skip invalid hits
		}
		hits = append(hits, doc)
	}

	// Convert facets
	facets, err := convertMeilisearchFacets(resp.FacetDistribution)
	if err != nil {
		// Log error but don't fail the search
		facets = &hermessearch.Facets{
			Products: make(map[string]int),
			DocTypes: make(map[string]int),
			Statuses: make(map[string]int),
			Owners:   make(map[string]int),
		}
	}

	// Calculate total pages
	totalPages := 0
	if query.PerPage > 0 {
		totalPages = (int(resp.EstimatedTotalHits) + query.PerPage - 1) / query.PerPage
	}

	result := &hermessearch.SearchResult{
		Hits:       hits,
		TotalHits:  int(resp.EstimatedTotalHits),
		Page:       query.Page,
		PerPage:    query.PerPage,
		TotalPages: totalPages,
		Facets:     facets,
		QueryTime:  queryTime,
	}

	return result, nil
}

func (di *documentIndex) GetObject(ctx context.Context, docID string) (*hermessearch.Document, error) {
	idx := di.client.Index(di.index)

	var rawDoc meilisearch.Hit
	err := idx.GetDocumentWithContext(ctx, docID, nil, &rawDoc)
	if err != nil {
		return nil, &hermessearch.Error{
			Op:  "GetObject",
			Err: hermessearch.ErrNotFound,
			Msg: err.Error(),
		}
	}

	doc, err := convertMeilisearchHit(rawDoc)
	if err != nil {
		return nil, &hermessearch.Error{
			Op:  "GetObject",
			Err: err,
			Msg: "failed to convert document",
		}
	}

	return doc, nil
}

func (di *documentIndex) GetFacets(ctx context.Context, facetNames []string) (*hermessearch.Facets, error) {
	idx := di.client.Index(di.index)

	// Execute a search with no query to get facets
	req := &meilisearch.SearchRequest{
		Limit:  0, // Don't return any documents
		Facets: facetNames,
	}

	resp, err := idx.SearchWithContext(ctx, "", req)
	if err != nil {
		return nil, &hermessearch.Error{
			Op:  "GetFacets",
			Err: err,
		}
	}

	facets, err := convertMeilisearchFacets(resp.FacetDistribution)
	if err != nil {
		return nil, &hermessearch.Error{
			Op:  "GetFacets",
			Err: err,
			Msg: "failed to convert facets",
		}
	}
	return facets, nil
}

func (di *documentIndex) Clear(ctx context.Context) error {
	idx := di.client.Index(di.index)

	task, err := idx.DeleteAllDocumentsWithContext(ctx)
	if err != nil {
		return &hermessearch.Error{
			Op:  "Clear",
			Err: hermessearch.ErrIndexingFailed,
			Msg: err.Error(),
		}
	}

	// Wait for clearing to complete
	// Use minimum of: 5s default OR remaining context time
	waitTimeout := 5000 * time.Millisecond
	if deadline, ok := ctx.Deadline(); ok {
		remaining := time.Until(deadline)
		if remaining < waitTimeout {
			waitTimeout = remaining
		}
		if waitTimeout < 0 {
			waitTimeout = 0 // Context already expired
		}
	}
	_, err = di.client.WaitForTaskWithContext(ctx, task.TaskUID, waitTimeout)
	if err != nil {
		return &hermessearch.Error{
			Op:  "Clear",
			Err: hermessearch.ErrIndexingFailed,
			Msg: fmt.Sprintf("clear task failed: %v", err),
		}
	}

	return nil
}

// draftIndex implements search.DraftIndex (same as documentIndex).
type draftIndex struct {
	client meilisearch.ServiceManager
	index  string
}

// Implement all DraftIndex methods (delegate to documentIndex logic)
func (di *draftIndex) Index(ctx context.Context, doc *hermessearch.Document) error {
	docIdx := &documentIndex{client: di.client, index: di.index}
	return docIdx.Index(ctx, doc)
}

func (di *draftIndex) IndexBatch(ctx context.Context, docs []*hermessearch.Document) error {
	docIdx := &documentIndex{client: di.client, index: di.index}
	return docIdx.IndexBatch(ctx, docs)
}

func (di *draftIndex) Delete(ctx context.Context, docID string) error {
	docIdx := &documentIndex{client: di.client, index: di.index}
	return docIdx.Delete(ctx, docID)
}

func (di *draftIndex) DeleteBatch(ctx context.Context, docIDs []string) error {
	docIdx := &documentIndex{client: di.client, index: di.index}
	return docIdx.DeleteBatch(ctx, docIDs)
}

func (di *draftIndex) Search(ctx context.Context, query *hermessearch.SearchQuery) (*hermessearch.SearchResult, error) {
	docIdx := &documentIndex{client: di.client, index: di.index}
	return docIdx.Search(ctx, query)
}

func (di *draftIndex) GetObject(ctx context.Context, docID string) (*hermessearch.Document, error) {
	docIdx := &documentIndex{client: di.client, index: di.index}
	return docIdx.GetObject(ctx, docID)
}

func (di *draftIndex) GetFacets(ctx context.Context, facetNames []string) (*hermessearch.Facets, error) {
	docIdx := &documentIndex{client: di.client, index: di.index}
	return docIdx.GetFacets(ctx, facetNames)
}

func (di *draftIndex) Clear(ctx context.Context) error {
	docIdx := &documentIndex{client: di.client, index: di.index}
	return docIdx.Clear(ctx)
}

// Helper functions

func buildMeilisearchFilters(filters map[string][]string) interface{} {
	// Convert to Meilisearch filter syntax
	// Example: product = "terraform" AND status IN ["approved", "published"]
	var filterParts []string
	for key, values := range filters {
		if len(values) == 1 {
			filterParts = append(filterParts, fmt.Sprintf("%s = %q", key, values[0]))
		} else if len(values) > 1 {
			valueList := make([]string, len(values))
			for i, v := range values {
				valueList[i] = fmt.Sprintf("%q", v)
			}
			filterParts = append(filterParts, fmt.Sprintf("%s IN [%s]", key, strings.Join(valueList, ", ")))
		}
	}
	if len(filterParts) == 0 {
		return nil
	}
	return strings.Join(filterParts, " AND ")
}

// buildMeilisearchFilterGroups converts filter groups to Meilisearch filter syntax.
// It supports AND/OR operators for complex filter logic.
// Example: (owners = "user@example.com" OR contributors = "user@example.com")
func buildMeilisearchFilterGroups(filterGroups []hermessearch.FilterGroup) string {
	if len(filterGroups) == 0 {
		return ""
	}

	var groupParts []string
	for _, group := range filterGroups {
		if len(group.Filters) == 0 {
			continue
		}

		// Join filters within the group with the specified operator
		operator := " AND "
		if group.Operator == hermessearch.FilterOperatorOR {
			operator = " OR "
		}

		groupStr := strings.Join(group.Filters, operator)
		if len(group.Filters) > 1 {
			groupStr = "(" + groupStr + ")"
		}
		groupParts = append(groupParts, groupStr)
	}

	if len(groupParts) == 0 {
		return ""
	}

	// Multiple filter groups are combined with AND
	return strings.Join(groupParts, " AND ")
}

func convertMeilisearchHit(hit meilisearch.Hit) (*hermessearch.Document, error) {
	// Meilisearch Hit is map[string]json.RawMessage
	// We need to marshal it to JSON and unmarshal to our Document struct
	data, err := json.Marshal(hit)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal hit: %w", err)
	}

	var doc hermessearch.Document
	if err := json.Unmarshal(data, &doc); err != nil {
		return nil, fmt.Errorf("failed to unmarshal document: %w", err)
	}

	return &doc, nil
}

func convertMeilisearchFacets(facetDistRaw json.RawMessage) (*hermessearch.Facets, error) {
	facets := &hermessearch.Facets{
		Products: make(map[string]int),
		DocTypes: make(map[string]int),
		Statuses: make(map[string]int),
		Owners:   make(map[string]int),
	}

	if len(facetDistRaw) == 0 {
		return facets, nil
	}

	// Unmarshal the raw JSON into a map
	var facetDist map[string]map[string]int64
	if err := json.Unmarshal(facetDistRaw, &facetDist); err != nil {
		return facets, fmt.Errorf("failed to unmarshal facet distribution: %w", err)
	}

	// Map Meilisearch facet names to Hermes facet fields
	for facetName, values := range facetDist {
		switch facetName {
		case "product":
			for value, count := range values {
				facets.Products[value] = int(count)
			}
		case "docType":
			for value, count := range values {
				facets.DocTypes[value] = int(count)
			}
		case "status":
			for value, count := range values {
				facets.Statuses[value] = int(count)
			}
		case "owners":
			for value, count := range values {
				facets.Owners[value] = int(count)
			}
		}
	}

	return facets, nil
}

// projectIndex implements search.ProjectIndex.
type projectIndex struct {
	client meilisearch.ServiceManager
	index  string
}

func (pi *projectIndex) Index(ctx context.Context, project map[string]any) error {
	idx := pi.client.Index(pi.index)
	primaryKey := "objectID"
	_, err := idx.AddDocuments([]map[string]any{project}, &primaryKey)
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
	idx := pi.client.Index(pi.index)
	_, err := idx.DeleteDocument(projectID)
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
	return nil, fmt.Errorf("Search not yet implemented for projects")
}

func (pi *projectIndex) GetObject(ctx context.Context, projectID string) (map[string]any, error) {
	idx := pi.client.Index(pi.index)
	var project map[string]any
	err := idx.GetDocument(projectID, nil, &project)
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
	idx := pi.client.Index(pi.index)
	_, err := idx.DeleteAllDocuments()
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
	client meilisearch.ServiceManager
	index  string
}

func (li *linksIndex) SaveLink(ctx context.Context, link map[string]string) error {
	idx := li.client.Index(li.index)
	// Convert to []map[string]any for Meilisearch API
	linkAny := make(map[string]any)
	for k, v := range link {
		linkAny[k] = v
	}
	primaryKey := "objectID"
	_, err := idx.AddDocuments([]map[string]any{linkAny}, &primaryKey)
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
	idx := li.client.Index(li.index)
	_, err := idx.DeleteDocument(objectID)
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
	idx := li.client.Index(li.index)
	var linkAny map[string]any
	err := idx.GetDocument(objectID, nil, &linkAny)
	if err != nil {
		return nil, &hermessearch.Error{
			Op:  "GetLink",
			Err: hermessearch.ErrNotFound,
			Msg: err.Error(),
		}
	}

	// Convert back to map[string]string
	link := make(map[string]string)
	for k, v := range linkAny {
		if str, ok := v.(string); ok {
			link[k] = str
		}
	}

	return link, nil
}

func (li *linksIndex) Clear(ctx context.Context) error {
	idx := li.client.Index(li.index)
	_, err := idx.DeleteAllDocuments()
	if err != nil {
		return &hermessearch.Error{
			Op:  "Clear",
			Err: hermessearch.ErrIndexingFailed,
			Msg: err.Error(),
		}
	}
	return nil
}
