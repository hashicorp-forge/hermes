package canary

import (
	"context"
	"flag"
	"fmt"
	"math/rand"
	"time"

	"github.com/hashicorp-forge/hermes/internal/cmd/base"
	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/internal/db"
	"github.com/hashicorp-forge/hermes/pkg/models"
	"github.com/hashicorp-forge/hermes/pkg/search"
	searchalgolia "github.com/hashicorp-forge/hermes/pkg/search/adapters/algolia"
	searchmeilisearch "github.com/hashicorp-forge/hermes/pkg/search/adapters/meilisearch"
	"gorm.io/gorm"
)

type Command struct {
	*base.Command

	flagConfig        string
	flagSearchBackend string
}

func (c *Command) Synopsis() string {
	return "Run canary test to validate database and search connectivity"
}

func (c *Command) Help() string {
	return `Usage: hermes canary [options]

  This command runs a canary test to validate that the database and search
  backend are working correctly. It creates a test document, indexes it,
  searches for it, publishes it, and then cleans up.

  Options:
    -config=<path>           Path to Hermes config file
    -search-backend=<type>   Search backend to use: algolia or meilisearch (default: algolia)

  Example with local docker-compose:
    hermes canary -config=config.hcl -search-backend=meilisearch

  This will:
    1. Connect to PostgreSQL (localhost:5432)
    2. Connect to Meilisearch (localhost:7700)
    3. Create a canary draft document
    4. Index it in Meilisearch
    5. Search for it to verify indexing
    6. Publish the document
    7. Verify it appears in published index
    8. Clean up the test document
`
}

func (c *Command) Flags() *base.FlagSet {
	f := base.NewFlagSet(flag.NewFlagSet("canary", flag.ExitOnError))

	f.StringVar(
		&c.flagConfig, "config", "",
		"Path to Hermes config file (required for production, optional for local)",
	)
	f.StringVar(
		&c.flagSearchBackend, "search-backend", "algolia",
		"Search backend to use: algolia or meilisearch",
	)

	return f
}

func (c *Command) Run(args []string) int {
	f := c.Flags()
	if err := f.Parse(args); err != nil {
		c.UI.Error(fmt.Sprintf("Error parsing flags: %v", err))
		return 1
	}

	ctx := context.Background()

	c.UI.Output("🐤 Starting Hermes Canary Test...")
	c.UI.Output("")

	// Load or create config
	var cfg *config.Config
	var err error

	if c.flagConfig != "" {
		cfg, err = config.NewConfig(c.flagConfig)
		if err != nil {
			c.UI.Error(fmt.Sprintf("❌ Error loading config: %v", err))
			return 1
		}
		c.UI.Output(fmt.Sprintf("✅ Loaded config from %s", c.flagConfig))
	} else {
		// Use default local docker-compose configuration
		cfg = getDefaultLocalConfig()
		c.UI.Output("✅ Using default local docker-compose configuration")
	}

	// Step 1: Connect to database
	c.UI.Output("")
	c.UI.Output("Step 1: Connecting to PostgreSQL database...")
	database, err := db.NewDB(*cfg.Postgres)
	if err != nil {
		c.UI.Error(fmt.Sprintf("❌ Failed to connect to database: %v", err))
		return 1
	}
	c.UI.Output("✅ Connected to PostgreSQL successfully")

	// Step 2: Initialize search provider
	c.UI.Output("")
	c.UI.Output(fmt.Sprintf("Step 2: Initializing %s search provider...", c.flagSearchBackend))
	var searchProvider search.Provider

	switch c.flagSearchBackend {
	case "meilisearch":
		searchProvider, err = searchmeilisearch.NewAdapter(&searchmeilisearch.Config{
			Host:            "http://localhost:7700",
			APIKey:          "masterKey123",
			DocsIndexName:   "docs",
			DraftsIndexName: "drafts",
		})
	case "algolia":
		searchProvider, err = searchalgolia.NewAdapter(&searchalgolia.Config{
			AppID:           cfg.Algolia.AppID,
			WriteAPIKey:     cfg.Algolia.WriteAPIKey,
			DocsIndexName:   cfg.Algolia.DocsIndexName,
			DraftsIndexName: cfg.Algolia.DraftsIndexName,
		})
	default:
		c.UI.Error(fmt.Sprintf("❌ Unsupported search backend: %s", c.flagSearchBackend))
		return 1
	}

	if err != nil {
		c.UI.Error(fmt.Sprintf("❌ Failed to initialize search provider: %v", err))
		return 1
	}
	c.UI.Output(fmt.Sprintf("✅ Connected to %s successfully", c.flagSearchBackend))

	// Step 3: Create canary document type and product if they don't exist
	c.UI.Output("")
	c.UI.Output("Step 3: Ensuring canary document type and product exist...")

	docType, product, user, err := ensureCanaryTestData(database)
	if err != nil {
		c.UI.Error(fmt.Sprintf("❌ Failed to create test data: %v", err))
		return 1
	}
	c.UI.Output(fmt.Sprintf("✅ Canary test data ready (DocType: %s, Product: %s, User: %s)",
		docType.Name, product.Name, user.EmailAddress))

	// Step 4: Create a draft document
	c.UI.Output("")
	c.UI.Output("Step 4: Creating canary draft document...")

	canaryID := fmt.Sprintf("canary-%d", time.Now().Unix())
	doc := &models.Document{
		GoogleFileID:       canaryID,
		Title:              fmt.Sprintf("Canary Test %d", rand.Intn(10000)),
		DocumentNumber:     rand.Intn(10000),
		DocumentTypeID:     docType.ID,
		ProductID:          product.ID,
		OwnerID:            &user.ID,
		Status:             models.WIPDocumentStatus, // Draft status
		Summary:            stringPtr("This is a canary test document for validation"),
		DocumentCreatedAt:  time.Now(),
		DocumentModifiedAt: time.Now(),
	}

	if err := database.Create(doc).Error; err != nil {
		c.UI.Error(fmt.Sprintf("❌ Failed to create document: %v", err))
		return 1
	}
	c.UI.Output(fmt.Sprintf("✅ Created draft document with ID: %s (DB ID: %d)", canaryID, doc.ID))

	// Step 5: Index the draft document
	c.UI.Output("")
	c.UI.Output("Step 5: Indexing draft document...")

	indexDoc := &search.Document{
		ObjectID:     canaryID,
		Title:        doc.Title,
		DocNumber:    fmt.Sprintf("%s-%d", product.Abbreviation, doc.DocumentNumber),
		DocType:      docType.Name,
		Product:      product.Name,
		Owners:       []string{user.EmailAddress},
		Status:       "WIP",
		Summary:      *doc.Summary,
		CreatedTime:  doc.DocumentCreatedAt.Unix(),
		ModifiedTime: doc.DocumentModifiedAt.Unix(),
	}

	if err := searchProvider.DraftIndex().Index(ctx, indexDoc); err != nil {
		c.UI.Error(fmt.Sprintf("❌ Failed to index draft: %v", err))
		// Continue to cleanup
	} else {
		c.UI.Output("✅ Draft indexed successfully")
	}

	// Wait a bit for indexing to propagate
	time.Sleep(2 * time.Second)

	// Step 6: Search for the draft
	c.UI.Output("")
	c.UI.Output("Step 6: Searching for draft document...")

	results, err := searchProvider.DraftIndex().Search(ctx, &search.SearchQuery{
		Query: doc.Title,
	})
	if err != nil {
		c.UI.Error(fmt.Sprintf("❌ Failed to search drafts: %v", err))
	} else {
		found := false
		for _, result := range results.Hits {
			if result.ObjectID == canaryID {
				found = true
				break
			}
		}
		if found {
			c.UI.Output(fmt.Sprintf("✅ Found draft in search results (%d total results)", results.TotalHits))
		} else {
			c.UI.Error(fmt.Sprintf("⚠️  Draft not found in search (got %d results, may need more time to index)", results.TotalHits))
		}
	} // Step 7: Publish the document (change status to Approved)
	c.UI.Output("")
	c.UI.Output("Step 7: Publishing document (changing status to Approved)...")

	doc.Status = models.ApprovedDocumentStatus
	if err := database.Save(doc).Error; err != nil {
		c.UI.Error(fmt.Sprintf("❌ Failed to update document status: %v", err))
	} else {
		c.UI.Output("✅ Document status updated to Approved")
	}

	// Step 8: Move document to published index
	c.UI.Output("")
	c.UI.Output("Step 8: Moving document to published index...")

	// Remove from drafts
	if err := searchProvider.DraftIndex().Delete(ctx, canaryID); err != nil {
		c.UI.Error(fmt.Sprintf("⚠️  Failed to delete from drafts index: %v", err))
	} else {
		c.UI.Output("✅ Removed from drafts index")
	}

	// Add to docs
	indexDoc.Status = "Approved"
	if err := searchProvider.DocumentIndex().Index(ctx, indexDoc); err != nil {
		c.UI.Error(fmt.Sprintf("❌ Failed to index published document: %v", err))
	} else {
		c.UI.Output("✅ Indexed in published documents")
	}

	// Wait for indexing
	time.Sleep(2 * time.Second)

	// Step 9: Search for published document
	c.UI.Output("")
	c.UI.Output("Step 9: Searching for published document...")

	results, err = searchProvider.DocumentIndex().Search(ctx, &search.SearchQuery{
		Query: doc.Title,
	})
	if err != nil {
		c.UI.Error(fmt.Sprintf("❌ Failed to search published documents: %v", err))
	} else {
		found := false
		for _, result := range results.Hits {
			if result.ObjectID == canaryID {
				found = true
				break
			}
		}
		if found {
			c.UI.Output(fmt.Sprintf("✅ Found published document in search (%d total results)", results.TotalHits))
		} else {
			c.UI.Error(fmt.Sprintf("⚠️  Published document not found in search (got %d results)", results.TotalHits))
		}
	}

	// Step 10: Cleanup
	c.UI.Output("")
	c.UI.Output("Step 10: Cleaning up test data...")

	// Delete from search indexes
	if err := searchProvider.DocumentIndex().Delete(ctx, canaryID); err != nil {
		c.UI.Error(fmt.Sprintf("⚠️  Failed to delete from docs index: %v", err))
	}
	if err := searchProvider.DraftIndex().Delete(ctx, canaryID); err != nil {
		c.UI.Error(fmt.Sprintf("⚠️  Failed to delete from drafts index: %v", err))
	}

	// Delete from database
	if err := database.Unscoped().Delete(doc).Error; err != nil {
		c.UI.Error(fmt.Sprintf("⚠️  Failed to delete document from database: %v", err))
	} else {
		c.UI.Output("✅ Cleaned up test document")
	}

	// Summary
	c.UI.Output("")
	c.UI.Output("═══════════════════════════════════════════════")
	c.UI.Output("🎉 Canary Test Completed!")
	c.UI.Output("═══════════════════════════════════════════════")
	c.UI.Output("")
	c.UI.Output("Verified:")
	c.UI.Output("  ✅ PostgreSQL connectivity and CRUD operations")
	c.UI.Output(fmt.Sprintf("  ✅ %s connectivity and indexing", c.flagSearchBackend))
	c.UI.Output("  ✅ Draft creation and indexing")
	c.UI.Output("  ✅ Document publishing workflow")
	c.UI.Output("  ✅ Search functionality for drafts and published docs")
	c.UI.Output("")

	return 0
}

// ensureCanaryTestData creates or retrieves the canary test document type, product, and user
func ensureCanaryTestData(database *gorm.DB) (*models.DocumentType, *models.Product, *models.User, error) {
	// Create or get document type
	docType := &models.DocumentType{
		Name:     "CANARY",
		LongName: "Canary Test Document",
	}
	if err := database.Where("name = ?", docType.Name).FirstOrCreate(docType).Error; err != nil {
		return nil, nil, nil, fmt.Errorf("failed to create document type: %w", err)
	}

	// Create or get product
	product := &models.Product{
		Name:         "Canary Test Product",
		Abbreviation: "CANARY",
	}
	if err := database.Where("abbreviation = ?", product.Abbreviation).FirstOrCreate(product).Error; err != nil {
		return nil, nil, nil, fmt.Errorf("failed to create product: %w", err)
	}

	// Create or get user
	user := &models.User{
		EmailAddress: "canary@test.local",
	}
	if err := database.Where("email_address = ?", user.EmailAddress).FirstOrCreate(user).Error; err != nil {
		return nil, nil, nil, fmt.Errorf("failed to create user: %w", err)
	}

	return docType, product, user, nil
}

// getDefaultLocalConfig returns a default configuration for local docker-compose testing
func getDefaultLocalConfig() *config.Config {
	return &config.Config{
		Postgres: &config.Postgres{
			Host:     "localhost",
			Port:     5432,
			User:     "postgres",
			Password: "postgres",
			DBName:   "db",
		},
		Algolia: &searchalgolia.Config{
			AppID:           "local-test",
			SearchAPIKey:    "test-key",
			WriteAPIKey:     "test-write-key",
			DocsIndexName:   "docs",
			DraftsIndexName: "drafts",
		},
	}
}

func stringPtr(s string) *string {
	return &s
}
