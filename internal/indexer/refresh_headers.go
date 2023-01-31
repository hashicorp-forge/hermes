package indexer

import (
	"fmt"
	"os"
	"sync"
	"time"

	"github.com/hashicorp-forge/hermes/pkg/algolia"
	hcd "github.com/hashicorp-forge/hermes/pkg/hashicorpdocs"
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
	LastFullIndexAt time.Time,
	runStartedAt time.Time,
) error {
	log := idx.Logger

	if ft == unspecifiedFolderType {
		return fmt.Errorf("folder type cannot be unspecified")
	}

	// Last run we checked for any updated files up until 30 minutes before that
	// so fromTime is 30 minutes before the last full index time.
	fromTime := LastFullIndexAt.Add(time.Duration(-30) * time.Minute).UTC()

	// If LastFullIndexAt was the Unix epoch, set fromTime to the epoch.
	if LastFullIndexAt.Equal(time.Unix(0, 0)) {
		fromTime = time.Unix(0, 0).UTC()
	}

	// Create from time string to use with Google Workspace APIs.
	fromTimeStr := fromTime.Format(time.RFC3339Nano)

	// untilTimeStr is 30 minutes ago in RFC 3339(Nano) format. We use this
	// because we don't want to update the doc headers for files that are
	// actively being modified by users.
	untilTimeStr := runStartedAt.Add(time.Duration(-30) * time.Minute).UTC().
		Format(time.RFC3339Nano)

	docs, err := idx.GoogleWorkspaceService.GetUpdatedDocsBetween(
		folderID,
		fromTimeStr,
		untilTimeStr,
	)
	if err != nil {
		return fmt.Errorf("error getting updated documents in folder: %w", err)
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
) {
	algo := idx.AlgoliaClient
	log := idx.Logger

	// Get base document object from Algolia so we can determine the document
	// type.
	var baseDocObj hcd.BaseDoc
	if err := getAlgoliaDocObject(algo, file.Id, ft, &baseDocObj); err != nil {
		log.Error("error getting document object from Algolia",
			"error", err,
			"google_file_id", file.Id,
		)
		os.Exit(1)
	}

	// Create new document object of the proper document type.
	docObj, err := hcd.NewEmptyDoc(baseDocObj.DocType)
	if err != nil {
		log.Error("error creating new empty document object",
			"error", err,
			"google_file_id", file.Id,
		)
		os.Exit(1)
	}

	// Get document object from Algolia.
	if err := getAlgoliaDocObject(algo, file.Id, ft, &docObj); err != nil {
		log.Error("error getting document object from Algolia",
			"error", err,
			"google_file_id", file.Id,
		)
		os.Exit(1)
	}

	// Replace document header.
	if err := docObj.ReplaceHeader(
		file.Id, idx.BaseURL, true, idx.GoogleWorkspaceService); err != nil {
		log.Error("error replacing document header",
			"error", err,
			"google_file_id", file.Id,
		)
		os.Exit(1)

	}

	log.Info("refreshed document header",
		"google_file_id", file.Id,
	)
}

func getAlgoliaDocObject(
	algo *algolia.Client,
	objectID string,
	ft folderType,
	target interface{},
) error {
	switch ft {
	case draftsFolderType:
		return algo.Drafts.GetObject(objectID, &target)
	case documentsFolderType:
		return algo.Docs.GetObject(objectID, &target)
	default:
		return fmt.Errorf("bad folder type: %v", ft)
	}

}
