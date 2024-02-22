package algolia

import (
	"fmt"
	"time"

	"github.com/algolia/algoliasearch-client-go/v3/algolia/opt"
	"github.com/algolia/algoliasearch-client-go/v3/algolia/search"
	validation "github.com/go-ozzo/ozzo-validation/v4"
)

// Client provides access to Hermes indexes in Algolia.
type Client struct {
	*search.Client

	// Docs is an Algolia index for searching documents.
	Docs *search.Index

	// DocsCreatedTimeAsc is an Algolia replica of the docs index that is sorted
	// by ascending created time.
	DocsCreatedTimeAsc *search.Index

	// DocsCreatedTimeDesc is an Algolia replica of the docs index that is sorted
	// by descending created time.
	DocsCreatedTimeDesc *search.Index

	// DocsModifiedTimeDesc is an Algolia replica of the docs index that is sorted
	// by descending modified time.
	DocsModifiedTimeDesc *search.Index

	// DocsModifiedTimeAsc is an Algolia replica of the docs index that is sorted
	// by ascending modified time.
	DocsModifiedTimeAsc *search.Index

	// Drafts is an Algolia index for storing metadata for draft documents.
	Drafts *search.Index

	// DraftsCreatedTimeAsc is an Algolia replica of the drafts index that is sorted
	// by ascending created time.
	DraftsCreatedTimeAsc *search.Index

	// DraftsCreatedTimeDesc is an Algolia replica of the drafts index that is sorted
	// by descending created time.
	DraftsCreatedTimeDesc *search.Index

	// DraftsModifiedTimeDesc is an Algolia replica of the drafts index that is sorted
	// by descending modified time.
	DraftsModifiedTimeDesc *search.Index

	// DraftsModifiedTimeAsc is an Algolia replica of the drafts index that is sorted
	// by ascending modified time.
	DraftsModifiedTimeAsc *search.Index

	// Internal is an Algolia index for storing internal Hermes metadata.
	Internal *search.Index

	// Links is an Algolia index for storing links of documents
	Links *search.Index

	// MissingFields is an Algolia index for storing missing fields from indexed
	// documents.
	MissingFields *search.Index

	// Projects is an Algolia index for storing projects.
	Projects *search.Index
}

// Config is the configuration for interacting with the Algolia API.
type Config struct {
	// ApplicationID is the Algolia Application ID.
	ApplicationID string `hcl:"application_id,optional"`

	// DocsIndexName is the name of the Algolia index for storing document
	// metadata.
	DocsIndexName string `hcl:"docs_index_name,optional"`

	// DraftsIndexName is the name of the Algolia index for storing draft
	// documents' metadata.
	DraftsIndexName string `hcl:"drafts_index_name,optional"`

	// InternalIndexName is the name of the Algolia index for storing internal
	// Hermes metadata.
	InternalIndexName string `hcl:"internal_index_name,optional"`

	// LinksIndexName is the name of the Algolia index for storing links
	LinksIndexName string `hcl:"links_index_name,optional"`

	// MissingFieldsIndexName is the name of the Algolia index for storing missing
	// fields from indexed documents.
	MissingFieldsIndexName string `hcl:"missing_fields_index_name,optional"`

	// ProjectsIndexName is the name of the Algolia index for storing projects.
	ProjectsIndexName string `hcl:"projects_index_name,optional"`

	// SearchAPIKey is the Algolia API Key for searching Hermes indices.
	SearchAPIKey string `hcl:"search_api_key,optional"`

	// WriteAPIKey is the Algolia API Key for writing to Hermes indices.
	WriteAPIKey string `hcl:"write_api_key,optional"`
}

// New initializes Hermes indices and returns a new Algolia client for
// indexing data.
func New(cfg *Config) (*Client, error) {
	if err := validate(cfg); err != nil {
		return nil, fmt.Errorf("error initializing Algolia client: %q", err)
	}

	c := &Client{}

	// TODO: make timeouts configurable.
	a := search.NewClientWithConfig(search.Configuration{
		AppID:        cfg.ApplicationID,
		APIKey:       cfg.WriteAPIKey,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
	})

	c.Docs = a.InitIndex(cfg.DocsIndexName)
	c.Drafts = a.InitIndex(cfg.DraftsIndexName)
	c.Internal = a.InitIndex(cfg.InternalIndexName)
	c.Links = a.InitIndex(cfg.LinksIndexName)
	c.MissingFields = a.InitIndex(cfg.MissingFieldsIndexName)
	c.Projects = a.InitIndex(cfg.ProjectsIndexName)

	// Configure the docs index.
	err := configureMainIndex(cfg.DocsIndexName, c.Docs, search.Settings{
		// Attributes
		AttributesForFaceting: opt.AttributesForFaceting(
			"appCreated",
			"approvers",
			"approvedBy",
			"docType",
			"owners",
			"searchable(product)",
			"status",
			"searchable(tags)",
		),

		// Highlighting/snippeting
		AttributesToSnippet: opt.AttributesToSnippet(
			"content:30",
		),
		HighlightPostTag:    opt.HighlightPostTag("</mark>"),
		HighlightPreTag:     opt.HighlightPreTag(`<mark>`),
		SnippetEllipsisText: opt.SnippetEllipsisText("..."),

		// Ranking
		Replicas: opt.Replicas(
			cfg.DocsIndexName+"_createdTime_asc",
			cfg.DocsIndexName+"_createdTime_desc",
			cfg.DocsIndexName+"_modifiedTime_desc",
			cfg.DocsIndexName+"_modifiedTime_asc",
		),
	})
	if err != nil {
		return nil, err
	}

	// Configure the docs createdTime_asc, createdTime_desc, modifiedTime_desc, modifiedTime_asc replica.
	c.DocsCreatedTimeAsc = a.InitIndex(cfg.DocsIndexName + "_createdTime_asc")
	c.DocsCreatedTimeDesc = a.InitIndex(cfg.DocsIndexName + "_createdTime_desc")
	c.DocsModifiedTimeDesc = a.InitIndex(cfg.DocsIndexName + "_modifiedTime_desc")
	c.DocsModifiedTimeAsc = a.InitIndex(cfg.DocsIndexName + "_modifiedTime_asc")
	err = configureReplicaIndexes(
		cfg.DocsIndexName,
		c.DocsCreatedTimeAsc,
		c.DocsCreatedTimeDesc,
		c.DocsModifiedTimeDesc,
		c.DocsModifiedTimeAsc,
	)
	if err != nil {
		return nil, err
	}

	// Configure the drafts index.
	err = configureMainIndex(cfg.DraftsIndexName, c.Drafts, search.Settings{
		// Attributes
		AttributesForFaceting: opt.AttributesForFaceting(
			"contributors",
			"docType",
			"owners",
			"product",
			"status",
			"tags",
		),

		// Ranking
		Replicas: opt.Replicas(
			cfg.DraftsIndexName+"_createdTime_asc",
			cfg.DraftsIndexName+"_createdTime_desc",
			cfg.DraftsIndexName+"_modifiedTime_desc",
			cfg.DraftsIndexName+"_modifiedTime_asc",
		),
	})
	if err != nil {
		return nil, err
	}

	// Configure the drafts createdTime_asc, createdTime_desc, modifiedTime_desc, modifiedTime_asc replica.
	c.DraftsCreatedTimeAsc = a.InitIndex(cfg.DraftsIndexName + "_createdTime_asc")
	c.DraftsCreatedTimeDesc = a.InitIndex(cfg.DraftsIndexName + "_createdTime_desc")
	c.DraftsModifiedTimeDesc = a.InitIndex(cfg.DraftsIndexName + "_modifiedTime_desc")
	c.DraftsModifiedTimeAsc = a.InitIndex(cfg.DraftsIndexName + "_modifiedTime_asc")
	err = configureReplicaIndexes(
		cfg.DraftsIndexName,
		c.DraftsCreatedTimeAsc,
		c.DraftsCreatedTimeDesc,
		c.DraftsModifiedTimeDesc,
		c.DraftsModifiedTimeAsc,
	)
	if err != nil {
		return nil, err
	}

	return c, nil
}

// configureMainIndex configures the main index with settings
func configureMainIndex(indexName string, mainIndex *search.Index, settings search.Settings) error {
	res, err := mainIndex.SetSettings(settings)
	if err != nil {
		return fmt.Errorf("error setting settings for %s index: %w",
			indexName, err)
	}
	err = res.Wait()
	if err != nil {
		return fmt.Errorf("error setting settings for %s index: %w",
			indexName, err)
	}

	return nil
}

func configureReplicaIndexes(
	indexName string,
	createdTimeAscIndex *search.Index,
	createdTimeDescIndex *search.Index,
	modifiedTimeDescIndex *search.Index,
	modifiedTimeAscIndex *search.Index,
) error {
	// Configure the createdTime_asc replica for index.
	_, err := createdTimeAscIndex.SetSettings(search.Settings{
		AttributesForFaceting: opt.AttributesForFaceting(
			"contributors",
			"docType",
			"owners",
			"product",
			"status",
		),

		Ranking: opt.Ranking(
			"asc(createdTime)",
		),
	})
	if err != nil {
		return fmt.Errorf(
			"error setting settings for the %s createdTime_asc standard replica: %w",
			indexName, err)
	}

	// Configure the createdTime_desc replica for index.
	_, err = createdTimeDescIndex.SetSettings(search.Settings{
		AttributesForFaceting: opt.AttributesForFaceting(
			"contributors",
			"docType",
			"owners",
			"product",
			"status",
		),

		Ranking: opt.Ranking(
			"desc(createdTime)",
		),
	})
	if err != nil {
		return fmt.Errorf(
			"error setting settings for the %s createdTime_desc standard replica: %w",
			indexName, err)
	}

	// Configure the modifiedTime_desc replica for index.
	_, err = modifiedTimeDescIndex.SetSettings(search.Settings{
		AttributesForFaceting: opt.AttributesForFaceting(
			"status",
			"owners",
		),

		Ranking: opt.Ranking(
			"desc(modifiedTime)",
		),
	})
	if err != nil {
		return fmt.Errorf(
			"error setting settings for the %s modifiedTime_desc standard replica: %w",
			indexName, err)
	}

	// Configure the modifiedTime_asc replica for index.
	_, err = modifiedTimeAscIndex.SetSettings(search.Settings{
		AttributesForFaceting: opt.AttributesForFaceting(
			"status",
			"owners",
		),

		Ranking: opt.Ranking(
			"asc(modifiedTime)",
		),
	})
	if err != nil {
		return fmt.Errorf(
			"error setting settings for the %s modifiedTime_asc standard replica: %w",
			indexName, err)
	}

	return nil
}

// NewSearchClient returns a new Algolia client for searching indices.
func NewSearchClient(cfg *Config) (*Client, error) {
	if err := validate(cfg); err != nil {
		return nil, fmt.Errorf("error initializing Algolia client: %q", err)
	}

	c := &Client{}

	// TODO: make ReadTimeout configurable.
	a := search.NewClient(cfg.ApplicationID, cfg.SearchAPIKey)

	c.Docs = a.InitIndex(cfg.DocsIndexName)
	c.DocsCreatedTimeAsc = a.InitIndex(cfg.DocsIndexName + "_createdTime_asc")
	c.DocsCreatedTimeDesc = a.InitIndex(cfg.DocsIndexName + "_createdTime_desc")
	c.DocsModifiedTimeDesc = a.InitIndex(cfg.DocsIndexName + "_modifiedTime_desc")
	c.DocsModifiedTimeAsc = a.InitIndex(cfg.DocsIndexName + "_modifiedTime_asc")
	c.Drafts = a.InitIndex(cfg.DraftsIndexName)
	c.DraftsCreatedTimeAsc = a.InitIndex(cfg.DraftsIndexName + "_createdTime_asc")
	c.DraftsCreatedTimeDesc = a.InitIndex(cfg.DraftsIndexName + "_createdTime_desc")
	c.DraftsModifiedTimeDesc = a.InitIndex(cfg.DraftsIndexName + "_modifiedTime_desc")
	c.DraftsModifiedTimeAsc = a.InitIndex(cfg.DraftsIndexName + "_modifiedTime_asc")
	c.Internal = a.InitIndex(cfg.InternalIndexName)
	c.Links = a.InitIndex(cfg.LinksIndexName)
	c.Projects = a.InitIndex(cfg.ProjectsIndexName)

	return c, nil
}

// validate validates the Algolia configuration.
func validate(c *Config) error {
	return validation.ValidateStruct(c,
		validation.Field(&c.ApplicationID, validation.Required),
		validation.Field(&c.DocsIndexName, validation.Required),
		validation.Field(&c.DraftsIndexName, validation.Required),
		validation.Field(&c.InternalIndexName, validation.Required),
		validation.Field(&c.LinksIndexName, validation.Required),
		validation.Field(&c.MissingFieldsIndexName, validation.Required),
		validation.Field(&c.ProjectsIndexName, validation.Required),
		validation.Field(&c.SearchAPIKey, validation.Required),
	)
}
