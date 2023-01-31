package indexer

import (
	"errors"
	"fmt"
	"io"
	"os"
	"time"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/hashicorp-forge/hermes/pkg/algolia"
	gw "github.com/hashicorp-forge/hermes/pkg/googleworkspace"
	hcd "github.com/hashicorp-forge/hermes/pkg/hashicorpdocs"
	"github.com/hashicorp-forge/hermes/pkg/links"
	"github.com/hashicorp-forge/hermes/pkg/models"
	"github.com/hashicorp/go-hclog"
	"gorm.io/gorm"
)

const (
	// loggerName is the name of the logger.
	loggerName = "indexer"

	// maxContentSize is the maximum size of a document's content in bytes. If the
	// content is larger than this, it will be trimmed to this length.
	// Note: Algolia currently has a hard limit of 100000 bytes total per record.
	maxContentSize = 85000
)

// Indexer contains the indexer configuration.
type Indexer struct {
	// AlgoliaClient is the Algolia client.
	AlgoliaClient *algolia.Client

	// BaseURL is the base URL for the application.
	BaseURL string

	// Database is the database connection.
	Database *gorm.DB

	// DocumentsFolderID is the Google Drive ID of the folder containing published
	// documents to index.
	DocumentsFolderID string

	// DraftsFolderID is the Google Drive ID of the folder containing draft
	// documents to index.
	DraftsFolderID string

	// GoogleWorkspaceService is the Google Workspace service.
	GoogleWorkspaceService *gw.Service

	// Logger is the logger to use.
	Logger hclog.Logger

	// MaxParallelDocuments is the maximum number of documents that will be
	// simultaneously indexed.
	MaxParallelDocuments int

	// UpdateDocumentHeaders updates published document headers, if true.
	UpdateDocumentHeaders bool

	// UpdateDraftHeaders updates draft document headers, if true.
	UpdateDraftHeaders bool
}

type IndexerOption func(*Indexer)

// NewIndexer creates a new indexer.
func NewIndexer(opts ...IndexerOption) (*Indexer, error) {
	// Initialize a new indexer with defaults.
	idx := &Indexer{
		Logger: hclog.New(&hclog.LoggerOptions{
			Name: loggerName,
		}),
	}

	// Apply functional options.
	for _, opt := range opts {
		opt(idx)
	}

	// Validate indexer configuration.
	if err := idx.validate(); err != nil {
		return nil, err
	}

	return idx, nil
}

// validate validates the indexer configuration.
func (idx *Indexer) validate() error {
	return validation.ValidateStruct(idx,
		validation.Field(&idx.AlgoliaClient, validation.Required),
		validation.Field(&idx.BaseURL, validation.Required),
		validation.Field(&idx.Database, validation.Required),
		validation.Field(&idx.DocumentsFolderID, validation.Required),
		validation.Field(&idx.DraftsFolderID, validation.Required),
		validation.Field(&idx.GoogleWorkspaceService, validation.Required),
	)
}

// WithAlgoliaClient sets the Algolia client.
func WithAlgoliaClient(a *algolia.Client) IndexerOption {
	return func(i *Indexer) {
		i.AlgoliaClient = a
	}
}

// WithBaseURL sets the base URL.
func WithBaseURL(b string) IndexerOption {
	return func(i *Indexer) {
		i.BaseURL = b
	}
}

// WithDatabase sets the database.
func WithDatabase(db *gorm.DB) IndexerOption {
	return func(i *Indexer) {
		i.Database = db
	}
}

// WithDocumentsFolderID sets the documents folder ID.
func WithDocumentsFolderID(d string) IndexerOption {
	return func(i *Indexer) {
		i.DocumentsFolderID = d
	}
}

// WithDraftsFolderID sets the drafts folder ID.
func WithDraftsFolderID(d string) IndexerOption {
	return func(i *Indexer) {
		i.DraftsFolderID = d
	}
}

// WithGoogleWorkspaceService sets the Google Workspace service.
func WithGoogleWorkspaceService(g *gw.Service) IndexerOption {
	return func(i *Indexer) {
		i.GoogleWorkspaceService = g
	}
}

// WithLogger sets the logger.
func WithLogger(l hclog.Logger) IndexerOption {
	return func(i *Indexer) {
		i.Logger = l.Named(loggerName)
	}
}

// WithMaxParallelDocuments sets the number of documents (per folder) to index
// in parallel.
func WithMaxParallelDocuments(m int) IndexerOption {
	return func(i *Indexer) {
		i.MaxParallelDocuments = m
	}
}

// WithUpdateDocumentHeaders sets the boolean to update draft document headers.
func WithUpdateDocumentHeaders(u bool) IndexerOption {
	return func(i *Indexer) {
		i.UpdateDocumentHeaders = u
	}
}

// WithUpdateDraftHeaders sets the boolean to update draft document headers.
func WithUpdateDraftHeaders(u bool) IndexerOption {
	return func(i *Indexer) {
		i.UpdateDraftHeaders = u
	}
}

// Run runs the indexer.
// TODO: improve error handling.
func (idx *Indexer) Run() error {
	algo := idx.AlgoliaClient
	db := idx.Database
	gwSvc := idx.GoogleWorkspaceService
	log := idx.Logger

	for {
		runStartedAt := time.Now().UTC()
		runStartedAtStr := runStartedAt.UTC().Format(time.RFC3339Nano)

		// Get indexer metadata.
		md := models.IndexerMetadata{}
		if err := md.Get(db); err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				// This is the first time that the indexer is being run, so set last
				// full index timestamp to the Unix epoch.
				md.LastFullIndexAt = time.Unix(0, 0).UTC()
			} else {
				log.Error("error getting indexer metadata",
					"error", err,
				)
				os.Exit(1)
			}
		}

		// Get documents folder data from the database.
		docsFolderData := models.IndexerFolder{
			GoogleDriveID: idx.DocumentsFolderID,
		}
		if err := docsFolderData.Get(db); err != nil && !errors.Is(
			err, gorm.ErrRecordNotFound) {
			log.Error("error getting documents folder indexer data",
				"error", err,
			)
			os.Exit(1)
		}

		// If the last indexed timestamp doesn't exist, set it to the Unix epoch.
		if docsFolderData.LastIndexedAt.IsZero() {
			docsFolderData.LastIndexedAt = time.Unix(0, 0).UTC()
		}
		lastIndexedAtStr := docsFolderData.LastIndexedAt.UTC().Format(
			time.RFC3339Nano)

		log.Info("indexing documents folder",
			"folder_id", idx.DocumentsFolderID,
			"last_indexed_at", lastIndexedAtStr,
		)

		// Get documents that have been updated in the folder since it was last
		// indexed.
		docFiles, err := gwSvc.GetUpdatedDocsBetween(
			idx.DocumentsFolderID, lastIndexedAtStr, runStartedAtStr)
		if err != nil {
			log.Error("error getting updated document files",
				"error", err,
				"folder_id", idx.DocumentsFolderID,
				"last_indexed_at", lastIndexedAtStr,
				"run_started_at", runStartedAtStr,
			)
			os.Exit(1)
		}
		if len(docFiles) == 0 {
			log.Info("no new document updates since the last indexed time",
				"folder_id", idx.DocumentsFolderID,
				"last_indexed_at", lastIndexedAtStr,
			)
		}

		for _, file := range docFiles {
			logError := func(errMsg string, err error) {
				log.Error(errMsg,
					"error", err,
					"google_file_id", file.Id,
					"folder_id", idx.DocumentsFolderID,
					"last_indexed_at", lastIndexedAtStr,
				)
			}

			log.Info("indexing document",
				"google_file_id", file.Id,
				"folder_id", idx.DocumentsFolderID,
				"last_indexed_at", lastIndexedAtStr,
			)

			// Get document from database.
			dbDoc := models.Document{
				GoogleFileID: file.Id,
			}
			if err := dbDoc.Get(db); err != nil {
				logError("error getting document from the database", err)
				os.Exit(1)
			}

			// Parse document modified time.
			modifiedTime, err := time.Parse(time.RFC3339Nano, file.ModifiedTime)
			if err != nil {
				logError("error parsing document modified time", err)
				os.Exit(1)
			}

			// Set new modified for document record and update in database.
			dbDoc.DocumentModifiedAt = modifiedTime

			// Update document in database.
			if err := dbDoc.Upsert(db); err != nil {
				logError("error upserting document", err)
				os.Exit(1)
			}

			// Create new document object of the proper document type.
			docObj, err := hcd.NewEmptyDoc(dbDoc.DocumentType.Name)
			if err != nil {
				logError("error creating new empty document", err)
				os.Exit(1)
			}

			// Get document object from Algolia.
			if err := algo.Docs.GetObject(file.Id, &docObj); err != nil {
				logError("error retrieving document object from Algolia", err)
				os.Exit(1)
			}

			// Get document content.
			exp, err := gwSvc.Drive.Files.Export(file.Id, "text/plain").Download()
			if err != nil {
				logError("error exporting document", err)
				os.Exit(1)
			}
			content, err := io.ReadAll(exp.Body)
			if err != nil {
				logError("error reading exported document", err)
				os.Exit(1)
			}
			// Trim doc content if it is larger than the maximum size.
			if len(content) > maxContentSize {
				content = content[:maxContentSize]
			}

			// Update document object with content and latest modified time.
			docObj.SetContent(string(content))
			docObj.SetModifiedTime(modifiedTime.Unix())

			// Save the document in Algolia.
			if err := saveDocInAlgolia(docObj, idx.AlgoliaClient); err != nil {
				return fmt.Errorf("error saving document in Algolia: %w", err)
			}

			// Update last indexed time for folder if document modified time is later.
			if modifiedTime.After(docsFolderData.LastIndexedAt) {
				docsFolderData.LastIndexedAt = modifiedTime
			}

			log.Info("indexed document",
				"google_file_id", file.Id,
				"folder_id", idx.DocumentsFolderID,
			)
		}

		// Save last indexed time for the documents folder.
		if err := docsFolderData.Upsert(db); err != nil {
			log.Error("error upserting last indexed time for the folder",
				"folder_id", idx.DocumentsFolderID,
				"last_indexed_at", docsFolderData.LastIndexedAt,
			)
		}

		// Update draft document headers, if configured.
		if idx.UpdateDraftHeaders {
			log.Info("refreshing draft document headers")
			if err := refreshDocumentHeaders(
				*idx,
				idx.DraftsFolderID,
				draftsFolderType,
				md.LastFullIndexAt,
				runStartedAt,
			); err != nil {
				log.Error("error refreshing draft document headers",
					"error", err,
				)
				os.Exit(1)
			}
			log.Info("done refreshing draft document headers")
		}

		// Update published document headers, if configured.
		if idx.UpdateDocumentHeaders {
			log.Info("refreshing published document headers")
			if err := refreshDocumentHeaders(
				*idx,
				idx.DocumentsFolderID,
				documentsFolderType,
				md.LastFullIndexAt,
				runStartedAt,
			); err != nil {
				log.Error("error refreshing published document headers",
					"error", err,
				)
				os.Exit(1)
			}
			log.Info("done published document headers")
		}

		// Update the last full index time.
		md.LastFullIndexAt = runStartedAt.UTC()
		if err := md.Upsert(db); err != nil {
			log.Error("error upserting metadata with last full index time: %w", err)
			os.Exit(1)
		}

		log.Info("sleeping for a minute before the next indexing run...")
		// TODO: make sleep time configurable.
		time.Sleep(1 * time.Minute)
	}
}

// saveDoc saves a document struct and its redirect details in Algolia.
func saveDocInAlgolia(
	doc hcd.Doc,
	algo *algolia.Client,
) error {
	// Save document object.
	res, err := algo.Docs.SaveObject(doc)
	if err != nil {
		return fmt.Errorf("error saving document: %w", err)
	}
	err = res.Wait()
	if err != nil {
		return fmt.Errorf("error saving document: %w", err)
	}

	// Save document redirect details.
	if doc.GetDocNumber() != "" {
		err = links.SaveDocumentRedirectDetails(
			algo, doc.GetObjectID(), doc.GetDocType(), doc.GetDocNumber())
		if err != nil {
			return err
		}
	}

	return nil
}
