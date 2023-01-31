package indexer

/*
import (
	"fmt"
	"os"
	"strings"
	"sync"
	"time"

	hcd "github.com/hashicorp-forge/hermes/pkg/hashicorpdocs"
	"google.golang.org/api/drive/v3"
)

// Parse any recently updated published docs for product data and refresh
// published docs with updated doc headers, if configured.
func refreshPublishedDocsHeaders(products *products, cfg IndexerConfig) {
	if !cfg.DryRun {
		// Get last index record for published docs if it exists.
		lastIndexed := &lastIndexed{
			ObjectID:    "docs",
			LastIndexed: make(map[string]string),
		}
		if err := cfg.Algo.Internal.GetObject("docs", &lastIndexed); err != nil {
			cfg.Log.Error("error getting docs last indexed data", "error", err)
		}
		lastIndexedTimeString := lastIndexed.LastIndexed[cfg.AppConfig.GoogleWorkspace.DocsFolder]
		if lastIndexedTimeString == "" {
			// If timestamp doesn't exist, set it to the Unix epoch.
			lastIndexedTimeString = time.Unix(0, 0).UTC().Format(time.RFC3339)
		}

		cfg.Log.Info("refreshing published doc headers",
			"folder", cfg.AppConfig.GoogleWorkspace.DocsFolder,
			"last_indexed_time", lastIndexedTimeString,
		)

		// untilTimeString is 30 minutes ago in RFC 3339 format. We use this
		// because we don't want to update the doc headers for files that are
		// actively being modified by users.
		untilTimeString := time.Now().Add(time.Duration(-30) * time.Minute).UTC().
			Format(time.RFC3339)

		docs, err := cfg.Goog.GetUpdatedDocsBetween(
			cfg.AppConfig.GoogleWorkspace.DocsFolder,
			lastIndexedTimeString, untilTimeString)
		if err != nil {
			cfg.Log.Error(
				fmt.Errorf(
					"error getting updated published docs in folder: %w", err).Error())
			os.Exit(1)
		}

		if len(docs) == 0 {
			cfg.Log.Info("no new published doc updates since the last indexed time",
				"folder", cfg.AppConfig.GoogleWorkspace.DocsFolder)
		} else {
			// Create channel and wait group for goroutines to refresh doc headers.
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

			// Refresh doc headers in parallel.
			for i := 0; i < parallel; i++ {
				go func() {
					for {
						file, ok := <-ch
						if !ok {
							wg.Done()
							return
						}
						refreshDocHeader(
							file,
							lastIndexed,
							products,
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
		}

		// Save LastIndexed with the latest doc timestamp for the folder and
		// products data.
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

		products.Lock()
		err = saveProductsData(cfg.Algo, products)
		if err != nil {
			cfg.Log.Error(fmt.Errorf("error saving products data: %w", err).Error())
			os.Exit(1)
		}
		products.Unlock()

		cfg.Log.Info("finished refreshing published doc headers",
			"folder", cfg.AppConfig.GoogleWorkspace.DocsFolder,
			"last_indexed_time", lastIndexed.LastIndexed[cfg.AppConfig.GoogleWorkspace.DocsFolder])
	}
}

// refreshDocHeader refreshes the header for a published document.
func refreshDocHeader(
	file *drive.File,
	lastIndexed *lastIndexed,
	products *products,
	cfg IndexerConfig) {

	// Get base document object from Algolia so we can determine the doc type.
	baseDocObj := &hcd.BaseDoc{}
	err := cfg.Algo.Docs.GetObject(file.Id, &baseDocObj)
	if err != nil {
		cfg.Log.Error(
			fmt.Errorf(
				"error getting base document object from Algolia: %w", err).Error(),
			"id", file.Id)
		os.Exit(1)
	}

	// Create new document object of the proper doc type.
	docObj, err := hcd.NewEmptyDoc(baseDocObj.DocType)
	if err != nil {
		cfg.Log.Error(
			fmt.Errorf(
				"error creating new empty doc object: %w", err).Error(),
			"id", file.Id)
		os.Exit(1)
	}

	// Get document object from Algolia.
	err = cfg.Algo.Docs.GetObject(file.Id, &docObj)
	if err != nil {
		cfg.Log.Error(
			fmt.Errorf(
				"error getting document from Algolia: %w", err).Error(),
			"id", file.Id)
		os.Exit(1)
	}

	if cfg.AppConfig.Indexer.UpdateDocHeaders {
		// Replace doc header.
		docObj.ReplaceHeader(file.Id, cfg.AppConfig.BaseURL, true, cfg.Goog)

		// Re-get file because we just changed it and need the new modified
		// time.
		file, err = cfg.Goog.GetFile(file.Id)
		if err != nil {
			cfg.Log.Error(
				fmt.Errorf(
					"error getting document file from Google: %w", err).Error(),
				"id", file.Id)
			os.Exit(1)
		}
	}

	// Parse modified time.
	modifiedTime, err := time.Parse(time.RFC3339, file.ModifiedTime)
	if err != nil {
		cfg.Log.Error(
			fmt.Errorf("error parsing modified time: %w", err).Error(),
			"id", file.Id)
		os.Exit(1)
	}

	// If this doc was updated later than the last indexed time, update
	// the last indexed time of this folder with this doc's modified
	// time.
	lastIndexed.Lock()
	lastIndexedTimeString := lastIndexed.LastIndexed[cfg.AppConfig.GoogleWorkspace.DocsFolder]
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
		lastIndexed.LastIndexed[cfg.AppConfig.GoogleWorkspace.DocsFolder] = file.ModifiedTime
	}
	lastIndexed.Unlock()

	// Update product data.
	products.Lock()
	if err := updateProductData(
		docObj,
		strings.ToLower(docObj.GetDocType()),
		"",
		products,
		cfg.Log); err != nil {
		cfg.Log.Error(
			fmt.Errorf(
				"error updating product data: %w", err).Error(),
			"id", file.Id,
		)
		os.Exit(1)
	}
	products.Unlock()

	if cfg.AppConfig.Indexer.UpdateDocHeaders {
		cfg.Log.Info("updated published doc header",
			"id", file.Id,
			"modified_time", file.ModifiedTime,
		)
	}
}
*/
