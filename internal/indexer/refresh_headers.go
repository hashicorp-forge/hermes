package indexer

import (
	"fmt"
	"os"
	"sync"
	"time"

	"github.com/hashicorp-forge/hermes/pkg/document"
	hcd "github.com/hashicorp-forge/hermes/pkg/hashicorpdocs"
	"github.com/hashicorp-forge/hermes/pkg/models"
	gw "github.com/hashicorp-forge/hermes/pkg/workspace/adapters/google"
	"google.golang.org/api/drive/v3"
)

// folderType is a temporary hack until we only fetch document data from the
// database. It is needed so we know which Algolia index to fetch document data
// from.
type folderType int

const (
	unspecifiedFolderType folderType = iota
	draftsFolderType
	documentsFolderType
)

// refreshDocumentHeaders updates the header of any documents in a specified
// folder that been modified since the last indexer run but inactive in the last
// 30 minutes (to not disrupt users' editing).
func refreshDocumentHeaders(
	idx Indexer,
	folderID string,
	ft folderType,
	LastIndexedAt *safeTime,
	currentTime time.Time,
) error {
	log := idx.Logger

	if ft == unspecifiedFolderType {
		return fmt.Errorf("folder type cannot be unspecified")
	}

	// Create from time string to use with Google Workspace APIs.
	fromTimeStr := LastIndexedAt.time.UTC().Format(time.RFC3339Nano)

	// untilTimeStr is 30 minutes ago in RFC 3339(Nano) format. We use this
	// because we don't want to update the doc headers for files that are
	// actively being modified by users.
	untilTimeStr := currentTime.Add(time.Duration(-30) * time.Minute).UTC().
		Format(time.RFC3339Nano)

	docs, err := idx.GoogleWorkspaceService.GetUpdatedDocsBetween(
		folderID,
		fromTimeStr,
		untilTimeStr,
	)
	if err != nil {
		return fmt.Errorf("error getting updated documents in folder: %w", err)
	}

	// Add any locked documents to the slice of documents to refresh.
	lockedDocs := models.Documents{}
	switch ft {
	case draftsFolderType:
		lockedDocs.Find(idx.Database,
			"locked = ? AND status = ?", true, models.WIPDocumentStatus)
	case documentsFolderType:
		lockedDocs.Find(idx.Database,
			// All document statuses > WIPDocumentStatus are for published documents.
			"locked = ? AND status > ?", true, models.WIPDocumentStatus)
	}
	var lockedDocIDs []string
	for _, d := range lockedDocs {
		f, err := idx.GoogleWorkspaceService.GetFile(d.GoogleFileID)
		if err != nil {
			return fmt.Errorf("error getting file (%s): %w", d.GoogleFileID, err)
		}

		// Find if locked document is already in slice of updated documents and
		// append it if not.
		alreadyInDocs := false
		for _, doc := range docs {
			if doc.Id == d.GoogleFileID {
				alreadyInDocs = true
				break
			}
		}
		if !alreadyInDocs {
			docs = append(docs, f)
		}
		lockedDocIDs = append(lockedDocIDs, d.GoogleFileID)
	}
	if ft == draftsFolderType {
		log.Info(fmt.Sprintf("locked draft document IDs: %v", lockedDocIDs))
	} else {
		log.Info(fmt.Sprintf("locked document IDs: %v", lockedDocIDs))
	}

	// Return if there are no updated documents.
	if len(docs) == 0 {
		log.Info("no new updated documents to refresh headers",
			"folder_id", folderID,
			"from_time", fromTimeStr,
			"until_time", untilTimeStr,
		)
		return nil
	}

	// Create channel and wait group for goroutines to refresh document headers.
	var wg sync.WaitGroup
	var ch = make(chan *drive.File, len(docs))

	// The number of worker goroutines is the lesser of the number of documents
	// or MaxParallelDocuments.
	var parallel int
	if len(docs) < idx.MaxParallelDocuments {
		parallel = len(docs)
	} else {
		parallel = idx.MaxParallelDocuments
	}
	wg.Add(parallel)

	// Refresh document headers in parallel.
	for i := 0; i < parallel; i++ {
		go func() {
			for {
				file, ok := <-ch
				if !ok {
					wg.Done()
					return
				}
				refreshDocumentHeader(
					idx,
					file,
					ft,
					LastIndexedAt,
				)
			}
		}()
	}
	for _, doc := range docs {
		ch <- doc
	}
	close(ch)

	wg.Wait()

	return nil
}

// refreshDocumentHeader refreshes the header for a published document.
// TODO: improve error handling.
func refreshDocumentHeader(
	idx Indexer,
	file *drive.File,
	ft folderType,
	lastIndexedAt *safeTime,
) {
	algo := idx.AlgoliaClient
	log := idx.Logger

	// Check if document is locked.
	provider := gw.NewAdapter(idx.GoogleWorkspaceService)
	locked, err := hcd.IsLocked(
		file.Id, idx.Database, provider, log)
	if err != nil {
		log.Error("error checking document locked status",
			"error", err,
			"google_file_id", file.Id,
		)
		os.Exit(1)
	}
	// Don't continue if document is locked.
	if locked {
		return
	}

	var doc *document.Document
	if idx.UseDatabaseForDocumentData {
		// Get document from database.
		model := models.Document{
			GoogleFileID: file.Id,
		}
		if err := model.Get(idx.Database); err != nil {
			log.Error("error getting document from database",
				"error", err,
				"google_file_id", file.Id,
			)
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

		// Convert database record to a document.
		doc, err = document.NewFromDatabaseModel(
			model, reviews, groupReviews)
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
		switch ft {
		case draftsFolderType:
			if err = algo.Drafts.GetObject(file.Id, &algoObj); err != nil {
				log.Error("error getting draft document object from Algolia",
					"error", err,
					"google_file_id", file.Id,
				)
				os.Exit(1)
			}
		case documentsFolderType:
			if err = algo.Docs.GetObject(file.Id, &algoObj); err != nil {
				log.Error("error getting document object from Algolia",
					"error", err,
					"google_file_id", file.Id,
				)
				os.Exit(1)
			}
		default:
			log.Error("bad folder type",
				"folder_type", ft,
			)
			os.Exit(1)
		}

		// Convert Algolia object to a document.
		doc, err = document.NewFromAlgoliaObject(
			algoObj, idx.DocumentTypes)
		if err != nil {
			log.Error("error converting Algolia object to document",
				"error", err,
				"google_file_id", file.Id,
			)
			os.Exit(1)
		}
	}

	// If the document was created through Hermes and has a status of "WIP", it
	// is a document draft.
	isDraft := false
	if doc.AppCreated && doc.Status == "WIP" {
		isDraft = true
	}

	// Replace document header.
	if err := doc.ReplaceHeader(
		idx.BaseURL, isDraft, provider); err != nil {
		log.Error("error replacing document header",
			"error", err,
			"google_file_id", file.Id,
		)
		os.Exit(1)
	}

	// Get the file again because we just modified it.
	file, err = idx.GoogleWorkspaceService.GetFile(file.Id)
	if err != nil {
		log.Error("error getting the file after replacing the header",
			"error", err,
			"google_file_id", file.Id,
		)
		os.Exit(1)
	}

	// Parse the modified time of the document.
	modifiedTime, err := time.Parse(time.RFC3339Nano, file.ModifiedTime)
	if err != nil {
		log.Error("error parsing file modified time",
			"error", err,
			"google_file_id", file.Id,
		)
		os.Exit(1)
	}

	// Update the last indexed time if this file's modified time is newer.
	lastIndexedAt.Lock()
	if modifiedTime.After(lastIndexedAt.time) {
		lastIndexedAt.time = modifiedTime
	}
	lastIndexedAt.Unlock()

	log.Info("refreshed document header",
		"google_file_id", file.Id,
	)
}
