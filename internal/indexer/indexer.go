package indexer

import (
	"errors"
	"fmt"
	"io"
	"os"
	"sync"
	"time"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/pkg/algolia"
	"github.com/hashicorp-forge/hermes/pkg/document"
	gw "github.com/hashicorp-forge/hermes/pkg/googleworkspace"
	"github.com/hashicorp-forge/hermes/pkg/links"
	"github.com/hashicorp-forge/hermes/pkg/models"
	"github.com/hashicorp/go-hclog"
	"gorm.io/gorm"

	sp "github.com/hashicorp-forge/hermes/pkg/sharepointhelper"
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
	DocumentsFolderID string

	SharePointDriveID string
	// DocumentTypes are a slice of document types from the application config.
	DocumentTypes []*config.DocumentType

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

	// UseDatabaseForDocumentData will use the database instead of Algolia as the
	// source of truth for document data, if true.
	UseDatabaseForDocumentData bool

	// sharepointSvc is the SharePoint service.
	sharepointSvc *sp.Service
}

// IndexerOption defines a functional option for configuring the Indexer.
type IndexerOption func(*Indexer)

// safeTime is a time.Time that is safe to use concurrently.
type safeTime struct {
	time time.Time
	sync.RWMutex
}

// NewIndexer creates a new indexer.
func NewIndexer(cfg *config.Config, opts ...IndexerOption) (*Indexer, error) {
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

	// Validate configuration
	if err := idx.validate(); err != nil {
		return nil, err
	}

	// Load SharePointDriveID from configuration
	if idx.sharepointSvc != nil {
		idx.SharePointDriveID = cfg.SharePoint.DriveID
	}

	return idx, nil
}

// validate validates the indexer configuration.
func (idx *Indexer) validate() error {
	if idx.sharepointSvc != nil {
		// If SharePoint is configured, validate SharePoint-specific fields.
		return validation.ValidateStruct(idx,
			validation.Field(&idx.AlgoliaClient, validation.Required),
			validation.Field(&idx.BaseURL, validation.Required),
			validation.Field(&idx.Database, validation.Required),
			validation.Field(&idx.DocumentTypes, validation.Required),
			validation.Field(&idx.sharepointSvc, validation.Required),     // Ensure SharePoint service is set
			validation.Field(&idx.DraftsFolderID, validation.Required),    // Validate SharePoint drafts folder
			validation.Field(&idx.DocumentsFolderID, validation.Required), // Validate SharePoint documents folder
		)
	}

	// If SharePoint is not configured, validate Google Workspace-specific fields.
	return validation.ValidateStruct(idx,
		validation.Field(&idx.AlgoliaClient, validation.Required),
		validation.Field(&idx.BaseURL, validation.Required),
		validation.Field(&idx.Database, validation.Required),
		validation.Field(&idx.DocumentsFolderID, validation.Required),
		validation.Field(&idx.DocumentTypes, validation.Required),
		validation.Field(&idx.DraftsFolderID, validation.Required),
		validation.Field(&idx.GoogleWorkspaceService, validation.Required), // Ensure Google Workspace service is set
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

// WithDocumentTypes sets the document types.
func WithDocumentTypes(dts []*config.DocumentType) IndexerOption {
	return func(i *Indexer) {
		i.DocumentTypes = dts
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

// WithUseDatabaseForDocumentData sets the boolean to use the database for
// document data.
func WithUseDatabaseForDocumentData(u bool) IndexerOption {
	return func(i *Indexer) {
		i.UseDatabaseForDocumentData = u
	}
}

// WithSharePointService sets the SharePoint service for the Indexer.
func WithSharePointService(sharepointSvc *sp.Service) IndexerOption {
	return func(i *Indexer) {
		i.sharepointSvc = sharepointSvc
	}
}

// Run runs the indexer.
// TODO: improve error handling.
func (idx *Indexer) Run() error {
	log := idx.Logger

	for {
		if idx.sharepointSvc != nil {
			if err := idx.runSharePoint(); err != nil {
				log.Error("SharePoint indexing error", "error", err)
			}
		} else {
			if err := idx.runGoogleWorkspace(); err != nil {
				log.Error("Google Workspace indexing error", "error", err)
			}
		}
		log.Info("Sleeping for a minute before the next indexing run...")
		time.Sleep(1 * time.Minute)
	}
}

// --- SharePoint indexing logic ---
func (idx *Indexer) runSharePoint() error {
	runStartedAt := time.Now().UTC()

	// Metadata tracking
	md := models.IndexerMetadata{}
	if err := md.Get(idx.Database); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			md.LastFullIndexAt = time.Unix(0, 0).UTC()
		} else {
			return fmt.Errorf("error getting indexer metadata: %w", err)
		}
	}

	// Drafts
	if idx.UpdateDraftHeaders {
		if err := idx.refreshSharePointFolder(idx.DraftsFolderID, "drafts"); err != nil {
			return err
		}
	}

	// Published
	if idx.UpdateDocumentHeaders {
		if err := idx.refreshSharePointFolder(idx.DocumentsFolderID, "published"); err != nil {
			return err
		}
	}

	// Update metadata
	md.LastFullIndexAt = runStartedAt.UTC()
	if err := md.Upsert(idx.Database); err != nil {
		return fmt.Errorf("error upserting metadata: %w", err)
	}
	return nil
}

func (idx *Indexer) refreshSharePointFolder(folderID, folderType string) error {
	log := idx.Logger
	currentTime := time.Now().UTC()

	// Get the last indexed time for the folder from the database.
	fd := models.IndexerFolder{
		SharePointFolderID: fmt.Sprintf("refreshHeaders:%s", folderID),
	}
	if err := fd.Get(idx.Database); err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return fmt.Errorf("error getting folder indexer data: %w", err)
	}

	// If the last indexed timestamp doesn't exist, set it to the Unix epoch.
	if fd.LastIndexedAt.IsZero() {
		fd.LastIndexedAt = time.Unix(0, 0).UTC()
	}

	// Fetch and process documents modified between the last indexed time and now.
	docs, err := idx.sharepointSvc.FetchDocuments(idx.SharePointDriveID, folderID, fd.LastIndexedAt, currentTime)
	if err != nil {
		return fmt.Errorf("error fetching %s documents from SharePoint: %w", folderType, err)
	}

	// Process the fetched documents.
	processSharePointDocs(docs, folderType, idx)

	// Update the last indexed time for the folder.
	fd.LastIndexedAt = currentTime
	if err := fd.Upsert(idx.Database); err != nil {
		log.Error("error upserting last indexed time for folder", "folder_id", folderID, "last_indexed_at", fd.LastIndexedAt)
	}

	log.Info("done refreshing " + folderType + " document headers (SharePoint)")
	return nil
}

// --- Google Workspace indexing logic ---
func (idx *Indexer) runGoogleWorkspace() error {
	algo := idx.AlgoliaClient
	gwSvc := idx.GoogleWorkspaceService
	log := idx.Logger
	runStartedAt := time.Now().UTC()

	// Get indexer metadata.
	md := models.IndexerMetadata{}
	if err := md.Get(idx.Database); err != nil {
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

	// Update draft document headers, if configured.
	if idx.UpdateDraftHeaders {
		log.Info("refreshing draft document headers",
			"folder_id", idx.DraftsFolderID,
		)
		currentTime := time.Now().UTC()

		// Get drafts folder data (headers) from the database.
		// Note: we add a "refreshHeaders:" prefix for the Google Drive ID here
		// to not conflict with with the actual last indexed time of the folder
		// (if we're indexing it, that is).
		fd := models.IndexerFolder{
			GoogleDriveID: fmt.Sprintf("refreshHeaders:%s", idx.DraftsFolderID),
		}
		if err := fd.Get(idx.Database); err != nil && !errors.Is(
			err, gorm.ErrRecordNotFound) {
			log.Error("error getting drafts headers folder indexer data",
				"error", err,
			)
			os.Exit(1)
		}

		// If the last indexed timestamp doesn't exist, set it to the Unix epoch.
		if fd.LastIndexedAt.IsZero() {
			fd.LastIndexedAt = time.Unix(0, 0).UTC()
		}

		// Create safe last indexed time for the folder so we can pass this to
		// goroutines.
		safeLastIndexedAt := &safeTime{
			fd.LastIndexedAt,
			sync.RWMutex{},
		}

		if err := refreshDocumentHeaders(
			*idx,
			idx.DraftsFolderID,
			draftsFolderType,
			safeLastIndexedAt,
			currentTime,
		); err != nil {
			log.Error("error refreshing draft document headers",
				"error", err,
			)
			os.Exit(1)
		}

		// Save last indexed time for the drafts folder (headers).
		fd.LastIndexedAt = safeLastIndexedAt.time
		if err := fd.Upsert(idx.Database); err != nil {
			log.Error(
				"error upserting last indexed time for the drafts headers folder",
				"folder_id", idx.DraftsFolderID,
				"last_indexed_at", fd.LastIndexedAt,
			)
		}

		log.Info("done refreshing draft document headers")
	}

	// Update published document headers, if configured.
	if idx.UpdateDocumentHeaders {
		log.Info("refreshing published document headers",
			"folder_id", idx.DocumentsFolderID,
		)
		currentTime := time.Now().UTC()

		// Get documents folder data (headers) from the database.
		// Note: we add a "refreshHeaders:" prefix for the Google Drive ID here
		// to not conflict with with the actual last indexed time of the folder
		// (if we're indexing it, that is).
		fd := models.IndexerFolder{
			GoogleDriveID: fmt.Sprintf("refreshHeaders:%s", idx.DocumentsFolderID),
		}
		if err := fd.Get(idx.Database); err != nil && !errors.Is(
			err, gorm.ErrRecordNotFound) {
			log.Error("error getting documents headers folder indexer data",
				"error", err,
			)
			os.Exit(1)
		}

		// If the last indexed timestamp doesn't exist, set it to the Unix epoch.
		if fd.LastIndexedAt.IsZero() {
			fd.LastIndexedAt = time.Unix(0, 0).UTC()
		}

		// Create safe last indexed time for the folder so we can pass this to
		// goroutines.
		safeLastIndexedAt := &safeTime{
			fd.LastIndexedAt,
			sync.RWMutex{},
		}

		if err := refreshDocumentHeaders(
			*idx,
			idx.DocumentsFolderID,
			documentsFolderType,
			safeLastIndexedAt,
			currentTime,
		); err != nil {
			log.Error("error refreshing published document headers",
				"error", err,
			)
			os.Exit(1)
		}

		// Save last indexed time for the documents folder (headers).
		fd.LastIndexedAt = safeLastIndexedAt.time
		if err := fd.Upsert(idx.Database); err != nil {
			log.Error(
				"error upserting last indexed time for the documents headers folder",
				"folder_id", idx.DocumentsFolderID,
				"last_indexed_at", fd.LastIndexedAt,
			)
		}

		log.Info("done refreshing published document headers")
	}

	// Get documents folder data from the database.
	docsFolderData := models.IndexerFolder{
		GoogleDriveID: idx.DocumentsFolderID,
	}
	if err := docsFolderData.Get(idx.Database); err != nil && !errors.Is(
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
	currentTime := time.Now().UTC()
	currentTimeStr := currentTime.UTC().Format(time.RFC3339Nano)

	// Get documents that have been updated in the folder since it was last
	// indexed.
	docFiles, err := gwSvc.GetUpdatedDocsBetween(
		idx.DocumentsFolderID, lastIndexedAtStr, currentTimeStr)
	if err != nil {
		log.Error("error getting updated document files",
			"error", err,
			"folder_id", idx.DocumentsFolderID,
			"after_time", lastIndexedAtStr,
			"before_time", currentTimeStr,
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
		if err := dbDoc.Get(idx.Database); err != nil {
			logError("error getting document from the database", err)
			os.Exit(1)
		}

		// Get reviews for the document from the database.
		var reviews models.DocumentReviews
		if err := reviews.Find(idx.Database, models.DocumentReview{
			Document: models.Document{
				GoogleFileID: file.Id,
			},
		}); err != nil {
			log.Error("error getting reviews for document",
				"error", err,
				"google_file_id", file.Id,
			)
			os.Exit(1)
		}

		// Get group reviews for the document.
		var groupReviews models.DocumentGroupReviews
		if err := groupReviews.Find(idx.Database, models.DocumentGroupReview{
			Document: models.Document{
				GoogleFileID: file.Id,
			},
		}); err != nil {
			log.Error("error getting group reviews for document",
				"error", err,
				"google_file_id", file.Id,
			)
			os.Exit(1)
		}

		// Parse document modified time.
		modifiedTime, err := time.Parse(time.RFC3339Nano, file.ModifiedTime)
		if err != nil {
			logError("error parsing document modified time", err)
			os.Exit(1)
		}

		// Set new modified time for document record.
		dbDoc.DocumentModifiedAt = modifiedTime

		// Update document in database.
		if err := dbDoc.Upsert(idx.Database); err != nil {
			logError("error upserting document", err)
			os.Exit(1)
		}

		var doc *document.Document
		if idx.UseDatabaseForDocumentData {
			// Convert database record to a document.
			doc, err = document.NewFromDatabaseModel(dbDoc, reviews, groupReviews)
			if err != nil {
				log.Error("error converting database record to document",
					"error", err,
					"google_file_id", file.Id,
				)
				os.Exit(1)
			}
		} else {
			// Get document object from Algolia.
			var algoObj map[string]any
			if err = algo.Docs.GetObject(file.Id, &algoObj); err != nil {
				logError("error retrieving document object from Algolia", err)
				os.Exit(1)
			}

			// Convert Algolia object to a document.
			doc, err = document.NewFromAlgoliaObject(algoObj, idx.DocumentTypes)
			if err != nil {
				logError("error converting Algolia object to document", err)
				os.Exit(1)
			}
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
		doc.Content = (string(content))
		doc.ModifiedTime = modifiedTime.Unix()

		// Save the document in Algolia.
		if err := saveDocInAlgolia(*doc, idx.AlgoliaClient); err != nil {
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
	if err := docsFolderData.Upsert(idx.Database); err != nil {
		log.Error("error upserting last indexed time for the folder",
			"folder_id", idx.DocumentsFolderID,
			"last_indexed_at", docsFolderData.LastIndexedAt,
		)
	}

	// Update the last full index time.
	md.LastFullIndexAt = runStartedAt.UTC()
	if err := md.Upsert(idx.Database); err != nil {
		log.Error("error upserting metadata with last full index time: %w", err)
		os.Exit(1)
	}
	return nil
}

// saveDoc saves a document struct and its redirect details in Algolia.
func saveDocInAlgolia(
	doc document.Document,
	algo *algolia.Client,
) error {
	// Convert document to Algolia object.
	docObj, err := doc.ToAlgoliaObject(true)
	if err != nil {
		return fmt.Errorf(
			"error converting document to Algolia object: %w", err)
	}

	// Save document object.
	res, err := algo.Docs.SaveObject(docObj)
	if err != nil {
		return fmt.Errorf("error saving document: %w", err)
	}
	err = res.Wait()
	if err != nil {
		return fmt.Errorf("error saving document: %w", err)
	}

	// Save document redirect details.
	if doc.DocNumber != "" {
		err = links.SaveDocumentRedirectDetails(
			algo, doc.ObjectID, doc.DocType, doc.DocNumber)
		if err != nil {
			return err
		}
	}

	return nil
}

// processSharePointDocs processes and indexes SharePoint documents.
func processSharePointDocs(docs []sp.Document, docType string, idx *Indexer) {
	log := idx.Logger

	for _, doc := range docs {
		logInfo := func(msg string, keyvals ...interface{}) {
			log.Info(msg, append(keyvals, "sharepoint_file_id", doc.ID)...)
		}
		logError := func(msg string, err error) {
			log.Error(msg,
				"error", err,
				"sharepoint_file_id", doc.ID,
			)
		}

		logInfo("processing document")

		// Get document from database.
		dbDoc := models.Document{
			SharePointFileID: doc.ID, // Use SharePoint-specific field
		}
		if err := dbDoc.Get(idx.Database); err != nil {
			logError("error getting document from the database", err)
			continue
		}

		// Get reviews for the document from the database.
		var reviews models.DocumentReviews
		if err := reviews.Find(idx.Database, models.DocumentReview{
			Document: models.Document{
				SharePointFileID: doc.ID, // Use SharePoint-specific field
			},
		}); err != nil {
			log.Error("error getting reviews for document",
				"error", err,
				"sharepoint_file_id", doc.ID,
			)
			continue
		}

		// Get group reviews for the document.
		var groupReviews models.DocumentGroupReviews
		if err := groupReviews.Find(idx.Database, models.DocumentGroupReview{
			Document: models.Document{
				SharePointFileID: doc.ID, // Use SharePoint-specific field
			},
		}); err != nil {
			log.Error("error getting group reviews for document",
				"error", err,
				"sharepoint_file_id", doc.ID,
			)
			continue
		}

		// Parse document modified time.
		modifiedTime, err := time.Parse(time.RFC3339Nano, doc.LastModifiedTime)
		if err != nil {
			logError("error parsing document modified time", err)
			continue
		}

		// Set new modified time for document record.
		dbDoc.DocumentModifiedAt = modifiedTime

		// Update document in database.
		if err := dbDoc.Upsert(idx.Database); err != nil {
			logError("error upserting document", err)
			continue
		}

		var documentObj *document.Document
		if idx.UseDatabaseForDocumentData {
			// Convert database record to a document.
			documentObj, err = document.NewFromDatabaseModel(dbDoc, reviews, groupReviews)
			if err != nil {
				log.Error("error converting database record to document",
					"error", err,
					"sharepoint_file_id", doc.ID,
				)
				continue
			}
		} else {
			// Get document object from Algolia.
			var algoObj map[string]any
			if err = idx.AlgoliaClient.Docs.GetObject(doc.ID, &algoObj); err != nil {
				logError("error retrieving document object from Algolia", err)
				continue
			}

			// Convert Algolia object to a document.
			documentObj, err = document.NewFromAlgoliaObject(algoObj, idx.DocumentTypes)
			if err != nil {
				logError("error converting Algolia object to document", err)
				continue
			}
		}

		// Get document content from SharePoint.
		content, err := idx.sharepointSvc.DownloadContent(doc.ID)
		if err != nil {
			logError("error downloading document content from SharePoint", err)
			continue
		}
		// Trim doc content if it is larger than the maximum size.
		if len(content) > maxContentSize {
			content = content[:maxContentSize]
		}

		// Update document object with content and latest modified time.
		documentObj.Content = string(content)
		documentObj.ModifiedTime = modifiedTime.Unix()

		// Save the document in Algolia.
		if err := saveDocInAlgolia(*documentObj, idx.AlgoliaClient); err != nil {
			logError("error saving document in Algolia", err)
			continue
		}

		logInfo("document processed and indexed")
	}
}
