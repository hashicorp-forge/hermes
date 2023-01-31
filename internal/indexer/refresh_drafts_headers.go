package indexer

/*
import (
	"fmt"
	"os"
	"sync"
	"time"

	"google.golang.org/api/drive/v3"

	hcd "github.com/hashicorp-forge/hermes/pkg/hashicorpdocs"
)

// Parse any recently updated drafts docs for product data and refresh
// drafts docs with updated doc headers, if configured.
func refreshDraftsDocsHeaders(products *products, cfg IndexerConfig) {
	if cfg.AppConfig.Indexer.UpdateDraftHeaders && !cfg.DryRun {
		// Get last indexed record for drafts if it exists.
		lastIndexed := &lastIndexed{
			ObjectID:    "drafts",
			LastIndexed: make(map[string]string),
		}
		_ = cfg.Algo.Internal.GetObject("drafts", &lastIndexed)
		lastIndexedTimeString := lastIndexed.LastIndexed[cfg.AppConfig.GoogleWorkspace.DraftsFolder]
		if lastIndexedTimeString == "" {
			// If timestamp doesn't exist, set it to the Unix epoch.
			lastIndexedTimeString = time.Unix(0, 0).UTC().Format(time.RFC3339)
		}

		cfg.Log.Info("refreshing drafts doc headers",
			"folder", cfg.AppConfig.GoogleWorkspace.DraftsFolder,
			"last_indexed_time", lastIndexedTimeString,
		)

		// untilTimeString is 30 minutes ago in RFC 3339 format. We use this
		// because we don't want to update the doc headers for files that are
		// actively being modified by users.
		untilTimeString := time.Now().Add(time.Duration(-30) * time.Minute).UTC().
			Format(time.RFC3339)

		docs, err := cfg.Goog.GetUpdatedDocsBetween(
			cfg.AppConfig.GoogleWorkspace.DraftsFolder,
			lastIndexedTimeString, untilTimeString)
		if err != nil {
			cfg.Log.Error(
				fmt.Errorf(
					"error getting updated draft docs in folder: %w", err).Error())
			os.Exit(1)
		}

		if len(docs) == 0 {
			cfg.Log.Info("no new draft doc updates since the last indexed time",
				"folder", cfg.AppConfig.GoogleWorkspace.DraftsFolder)
		}

		// Create channel and wait group for goroutines to refresh draft headers.
		var wg sync.WaitGroup
		var ch = make(chan *drive.File, len(docs))

		// The number of worker goroutines is the lesser of the number of docs or
		// maxParallelDocs.
		var parallel int
		if len(docs) < cfg.MaxParallelDocs {
			parallel = len(docs)
		} else {
			parallel = cfg.MaxParallelDocs
		}
		wg.Add(parallel)

		// Refresh draft headers in parallel.
		for i := 0; i < parallel; i++ {
			go func() {
				for {
					file, ok := <-ch
					if !ok {
						wg.Done()
						return
					}
					refreshDraftHeader(
						file,
						lastIndexed,
						cfg,
					)
				}
			}()
		}
		for _, doc := range docs {
			ch <- doc
		}
		close(ch)

		wg.Wait()

		// Save LastIndex with the latest doc timestamp for the folder.
		lastIndexed.Lock()
		res, err := cfg.Algo.Internal.SaveObject(lastIndexed)
		if err != nil {
			cfg.Log.Error(
				fmt.Errorf("error saving last index state: %w", err).Error())
			os.Exit(1)
		}
		err = res.Wait()
		if err != nil {
			cfg.Log.Error(
				fmt.Errorf("error saving last index state: %w", err).Error())
			os.Exit(1)
		}
		lastIndexed.Unlock()

		cfg.Log.Info("finished refreshing drafts doc headers",
			"folder", cfg.AppConfig.GoogleWorkspace.DraftsFolder,
			"last_indexed_time", lastIndexed.LastIndexed[cfg.AppConfig.GoogleWorkspace.DraftsFolder],
		)
	}
}

// refreshDraftHeader refreshes the header for a draft document.
func refreshDraftHeader(
	file *drive.File,
	lastIndexed *lastIndexed,
	cfg IndexerConfig) {

	// Get base document object from Algolia so we can determine the doc type.
	baseDocObj := &hcd.BaseDoc{}
	err := cfg.Algo.Drafts.GetObject(file.Id, &baseDocObj)
	if err != nil {
		cfg.Log.Error(
			fmt.Errorf(
				"error requesting base document object from Algolia: %w", err).Error(),
			"id", file.Id,
		)
		os.Exit(1)
	}

	// Create new document object of the proper doc type.
	docObj, err := hcd.NewEmptyDoc(baseDocObj.DocType)
	if err != nil {
		cfg.Log.Error(
			fmt.Errorf(
				"error creating new empty doc: %w", err).Error(),
			"id", file.Id,
		)
		os.Exit(1)
	}

	// Get document object from Algolia.
	err = cfg.Algo.Drafts.GetObject(file.Id, &docObj)
	if err != nil {
		cfg.Log.Error(
			fmt.Errorf(
				"error getting draft from Algolia: %w", err).Error(),
			"id", file.Id,
		)
		os.Exit(1)
	}

	// Replace doc header.
	docObj.ReplaceHeader(file.Id, cfg.AppConfig.BaseURL, true, cfg.Goog)

	// Re-get file because we just changed it and need the new modified
	// time.
	file, err = cfg.Goog.GetFile(file.Id)
	if err != nil {
		cfg.Log.Error(
			fmt.Errorf(
				"error getting draft file from Google: %w", err).Error(),
			"id", file.Id,
		)
		os.Exit(1)
	}

	// Parse modified time.
	modifiedTime, err := time.Parse(time.RFC3339, file.ModifiedTime)
	if err != nil {
		cfg.Log.Error(
			fmt.Errorf("error parsing modified time: %w", err).Error(),
			"id", file.Id,
		)
		os.Exit(1)
	}

	// If this doc was updated later than the last indexed time, update
	// the last indexed time of this folder with this doc's modified
	// time.
	lastIndexed.Lock()
	lastIndexedTimeString := lastIndexed.LastIndexed[cfg.AppConfig.GoogleWorkspace.DraftsFolder]
	if lastIndexedTimeString == "" {
		// If timestamp doesn't exist, set it to the Unix epoch.
		lastIndexedTimeString = time.Unix(0, 0).UTC().Format(time.RFC3339)
	}
	lastIndexedTime, err := time.Parse(time.RFC3339, lastIndexedTimeString)
	if err != nil {
		cfg.Log.Error(
			fmt.Errorf("error parsing last indexed time: %w", err).Error())
		os.Exit(1)
	}
	if modifiedTime.After(lastIndexedTime) {
		lastIndexed.LastIndexed[cfg.AppConfig.GoogleWorkspace.DraftsFolder] = file.ModifiedTime
	}
	lastIndexed.Unlock()

	cfg.Log.Info("refreshed draft header",
		"id", file.Id,
		"modified_time", file.ModifiedTime,
	)
}
*/
