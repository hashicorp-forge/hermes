package operator

import (
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"time"

	"github.com/algolia/algoliasearch-client-go/v3/algolia/search"
	validation "github.com/go-ozzo/ozzo-validation/v4"
	apiv2 "github.com/hashicorp-forge/hermes/internal/api/v2"
	"github.com/hashicorp-forge/hermes/internal/cmd/base"
	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/internal/db"
	"github.com/hashicorp-forge/hermes/pkg/algolia"
	"github.com/hashicorp-forge/hermes/pkg/document"
	"github.com/hashicorp-forge/hermes/pkg/models"
	"github.com/hashicorp/go-hclog"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"
)

type MigrateAlgoliaToPostgreSQLCommand struct {
	*base.Command

	flagAutoApprove bool
	flagConfig      string
	flagDryRun      bool
	flagVerbose     bool
}

// migrator contains the migrator configuration.
type migrator struct {
	Config         *config.Config
	Database       *gorm.DB
	DocsCreated    *int
	DocsUpdated    *int
	DocsWithErrors *[]string
	DryRun         bool
	Logger         hclog.Logger
	Verbose        bool
}

func (c *MigrateAlgoliaToPostgreSQLCommand) Synopsis() string {
	return "Migrate Algolia data to PostgreSQL"
}

func (c *MigrateAlgoliaToPostgreSQLCommand) Help() string {
	return `Usage: hermes operator migrate-algolia-to-postgresql

  This command migrates document data from Algolia to PostgreSQL.` +
		c.Flags().Help()
}

func (c *MigrateAlgoliaToPostgreSQLCommand) Flags() *base.FlagSet {
	f := base.NewFlagSet(
		flag.NewFlagSet("migrate-algolia-to-postgresql", flag.ExitOnError))

	f.BoolVar(
		&c.flagAutoApprove, "auto-approve", false,
		"Skip interactive approval for updating documents.",
	)
	f.StringVar(
		&c.flagConfig, "config", "", "(Required) Path to Hermes config file",
	)
	f.BoolVar(
		&c.flagDryRun, "dry-run", false,
		"Only print the changes to PostgreSQL data instead of updating the data.",
	)
	f.BoolVar(
		&c.flagVerbose, "verbose", false,
		"Print extra information.",
	)

	return f
}

func (c *MigrateAlgoliaToPostgreSQLCommand) Run(args []string) int {
	logger, ui := c.Log, c.UI

	// Parse flags.
	flags := c.Flags()
	if err := flags.Parse(args); err != nil {
		ui.Error(fmt.Sprintf("error parsing flags: %v", err))
		return 1
	}

	// Validate flags.
	if c.flagConfig == "" {
		ui.Error("config flag is required")
		return 1
	}

	// Parse configuration.
	cfg, err := config.NewConfig(c.flagConfig)
	if err != nil {
		ui.Error(fmt.Sprintf("error parsing config file: %v", err))
		return 1
	}

	// Validate configuration.
	if err := validation.ValidateStruct(cfg,
		validation.Field(&cfg.Algolia, validation.Required),
	); err != nil {
		ui.Error(fmt.Sprintf("error validating configuration: %v", err))
		return 1
	}
	if err := validation.ValidateStruct(cfg.Algolia,
		validation.Field(&cfg.Algolia.AppID, validation.Required),
		validation.Field(&cfg.Algolia.DocsIndexName, validation.Required),
		validation.Field(&cfg.Algolia.DraftsIndexName, validation.Required),
		validation.Field(&cfg.Algolia.WriteAPIKey, validation.Required),
	); err != nil {
		ui.Error(fmt.Sprintf("error validating configuration: %v", err))
		return 1
	}

	// Initialize Algolia client.
	// Note: Algolia requires a write API key to browse objects for...reasons.
	algoliaClientCfg := &algolia.Config{
		ApplicationID:          cfg.Algolia.AppID,
		SearchAPIKey:           cfg.Algolia.SearchAPIKey,
		WriteAPIKey:            cfg.Algolia.WriteAPIKey,
		DocsIndexName:          cfg.Algolia.DocsIndexName,
		DraftsIndexName:        cfg.Algolia.DraftsIndexName,
		InternalIndexName:      cfg.Algolia.InternalIndexName,
		LinksIndexName:         cfg.Algolia.LinksIndexName,
		MissingFieldsIndexName: cfg.Algolia.MissingFieldsIndexName,
		ProjectsIndexName:      cfg.Algolia.ProjectsIndexName,
	}
	algo, err := algolia.New(algoliaClientCfg)
	if err != nil {
		ui.Error(fmt.Sprintf("error initializing Algolia search client: %v", err))
		return 1
	}

	// Initialize database.
	if val, ok := os.LookupEnv("HERMES_SERVER_POSTGRES_PASSWORD"); ok {
		cfg.Postgres.Password = val
	}
	db, err := db.NewDB(*cfg.Postgres)
	if err != nil {
		ui.Error(fmt.Sprintf("error initializing database: %v", err))
		return 1
	}
	// Create GORM-compatible logger.
	stdLogger := logger.StandardLogger(&hclog.StandardLoggerOptions{
		InferLevels: true,
	})
	// Ignore "record not found" errors.
	db = db.Session(&gorm.Session{Logger: gormlogger.New(
		stdLogger,
		gormlogger.Config{IgnoreRecordNotFoundError: true},
	)})

	// If dry run is false, get confirmation that it is okay to update data in
	// PostgreSQL.
	if !c.flagDryRun && !c.flagAutoApprove {
		ui.Info("This will update records for all documents in PostgreSQL if they" +
			" differ from the data in Algolia.")
		ask, err := ui.Ask("Do you want to continue? (only \"yes\" will continue)")
		if err != nil || ask != "yes" {
			ui.Info("No \"yes\" confirmation, so exiting...")
			return 0
		}
	}

	// Create variables used to print results at the end.
	docsCreated := new(int)
	docsUpdated := new(int)
	docsWithErrors := &[]string{}

	// Create migrator.
	migrator := &migrator{
		Config:         cfg,
		Database:       db,
		DocsCreated:    docsCreated,
		DocsUpdated:    docsUpdated,
		DocsWithErrors: docsWithErrors,
		DryRun:         c.flagDryRun,
		Logger:         logger,
		Verbose:        c.flagVerbose,
	}

	start := time.Now()

	// Migrate docs index.
	docsIterator, err := algo.Docs.BrowseObjects()
	if err != nil {
		logger.Error("error getting docs Algolia object iterator",
			"error", err,
		)
		return 1
	}
	migrateIndex(migrator, docsIterator)

	// Migrate drafts index.
	draftsIterator, err := algo.Drafts.BrowseObjects()
	if err != nil {
		logger.Error("error getting drafts Algolia object iterator",
			"error", err,
		)
		return 1
	}
	migrateIndex(migrator, draftsIterator)

	// Print results.
	duration := time.Since(start)
	if !c.flagDryRun {
		fmt.Println("\nResults:")
	} else {
		fmt.Println("\nResults (dry run):")
	}
	fmt.Printf("  %d documents created\n", *docsCreated)
	fmt.Printf("  %d documents updated\n", *docsUpdated)
	fmt.Printf("  %d documents with errors\n", len(*docsWithErrors))
	fmt.Printf("\n\nCompleted in: %s\n", duration)
	fmt.Printf("\n\nDocuments with errors:\n%v\n", *docsWithErrors)

	return 0
}

// migrateIndex migrates all documents in an Algolia docs or drafts index.
func migrateIndex(
	m *migrator,
	it *search.ObjectIterator,
) {
	for {
		// Get base document object from Algolia.
		obj := map[string]interface{}{}
		_, err := it.Next(&obj)
		if err != nil {
			if err == io.EOF {
				break
			} else {
				m.Logger.Error("error decoding next object",
					"error", err,
				)
				os.Exit(1)
			}
		}

		// Convert Algolia object to a document.
		doc, err := document.NewFromAlgoliaObject(
			obj, m.Config.DocumentTypes.DocumentType)
		if err != nil {
			m.Logger.Error("error converting Algolia object to a document",
				"error", err,
				"document_id", obj["objectID"],
			)
			*m.DocsWithErrors = append(*m.DocsWithErrors, doc.ObjectID)
			continue
		}

		// Convert document to a document database model.
		dbDoc, reviews, err := doc.ToDatabaseModels(
			m.Config.DocumentTypes.DocumentType, m.Config.Products.Product)
		if err != nil {
			m.Logger.Error("error converting document to database models",
				"error", err,
				"document_id", doc.ObjectID,
			)
			*m.DocsWithErrors = append(*m.DocsWithErrors, doc.ObjectID)
			continue
		}

		// Check if document already exists in the database.
		existingDoc := models.Document{
			GoogleFileID: dbDoc.GoogleFileID,
		}
		err = existingDoc.Get(m.Database)
		if err != nil {
			// If the document doesn't exist, create it.
			if errors.Is(err, gorm.ErrRecordNotFound) {
				// Only save document if the -dry-run flag is not true.
				if !m.DryRun {
					// Save the document in a transaction so we rollback on any errors.
					if err := m.Database.Transaction(func(tx *gorm.DB) error {
						if err = dbDoc.Create(tx); err != nil {
							return fmt.Errorf("error creating document in database: %w", err)
						}

						// Create reviews.
						for _, dr := range reviews {
							if err := dr.Update(tx); err != nil {
								return fmt.Errorf("error upserting document review: %w", err)
							}
						}

						return nil
					}); err != nil {
						m.Logger.Error("error creating document",
							"error", err,
						)
						*m.DocsWithErrors = append(*m.DocsWithErrors, dbDoc.GoogleFileID)
						continue
					}

					*m.DocsCreated += 1
					m.Logger.Info("document created",
						"document_id", doc.ObjectID,
					)
				} else {
					*m.DocsCreated += 1

					logArgs := []any{"document_id", dbDoc.GoogleFileID}
					// Log additional document information if the verbose flag is true.
					if m.Verbose {
						if err == nil {
							logArgs = append(logArgs,
								"title", doc.Title,
								"summary", doc.Summary,
								"owners", doc.Owners,
								"status", doc.Status,
								"product", doc.Product,
							)
						}
					}
					m.Logger.Info("would have created document",
						logArgs...,
					)
				}
			} else {
				// We received an error getting the document.
				m.Logger.Error("error getting document in database",
					"error", err,
					"document_id", doc.ObjectID,
				)
				*m.DocsWithErrors = append(*m.DocsWithErrors, dbDoc.GoogleFileID)
				continue
			}
		} else {
			// There was no error getting the document so it already exists.

			// If the document modified time is later in the database, replace the
			// Algolia object with that so we effectively ignore it.
			if existingDoc.DocumentModifiedAt.After(time.Unix(doc.ModifiedTime, 0)) {
				// Algolia infers these values as float64 for some reason.
				obj["modifiedTime"] = float64(existingDoc.DocumentModifiedAt.Unix())

				// Also make sure that we don't replace it in the database.
				dbDoc.DocumentModifiedAt = existingDoc.DocumentModifiedAt
			}

			// Get all reviews for the document.
			var cmpReviews models.DocumentReviews
			if err := cmpReviews.Find(m.Database, models.DocumentReview{
				Document: models.Document{
					GoogleFileID: doc.ObjectID,
				},
			}); err != nil {
				m.Logger.Error(
					"error getting reviews for document for data comparison",
					"error", err,
					"document_id", doc.ObjectID,
				)
				*m.DocsWithErrors = append(*m.DocsWithErrors, dbDoc.GoogleFileID)
				continue
			}

			// Compare documents.
			docsDiffErr := apiv2.CompareAlgoliaAndDatabaseDocument(
				obj, existingDoc, cmpReviews, m.Config.DocumentTypes.DocumentType,
			)

			if docsDiffErr != nil {
				// Only actually save document if the -dry-run flag is not true.
				if !m.DryRun {
					// Save the document in a transaction so we rollback on any errors.
					if err := m.Database.Transaction(func(tx *gorm.DB) error {
						// Upsert document.
						if err = dbDoc.Upsert(tx); err != nil {
							return fmt.Errorf("error upserting document: %w", err)
						}

						// Find all file revisions for the document.
						var dbFileRevs models.DocumentFileRevisions
						if err := dbFileRevs.Find(
							tx, models.Document{GoogleFileID: doc.ObjectID},
						); err != nil {
							return fmt.Errorf("error finding all file revisions: %w", err)
						}

						// Create file revisions for any that don't exist.
						for revID, revName := range doc.FileRevisions {
							frExists := false
							for _, fr := range dbFileRevs {
								if fr.GoogleDriveFileRevisionID == revID && fr.Name == revName {
									frExists = true
									break
								}
							}
							if !frExists {
								fr := models.DocumentFileRevision{
									Document: models.Document{
										GoogleFileID: doc.ObjectID,
									},
									GoogleDriveFileRevisionID: revID,
									Name:                      revName,
								}
								if err := fr.Create(tx); err != nil {
									return fmt.Errorf("error creating new file revision: %w", err)
								}
							}
						}

						// Upsert document reviews.
						for _, dr := range reviews {
							if err := dr.Update(tx); err != nil {
								return fmt.Errorf("error upserting document review: %w", err)
							}
						}

						return nil
					}); err != nil {
						m.Logger.Error("error saving document",
							"error", err,
							"document_id", doc.ObjectID,
						)
						*m.DocsWithErrors = append(*m.DocsWithErrors, dbDoc.GoogleFileID)
						continue
					}

					*m.DocsUpdated += 1
					m.Logger.Info("document updated",
						"document_id", doc.ObjectID,
						"differences", docsDiffErr,
					)
				} else {
					*m.DocsUpdated += 1
					m.Logger.Info("would have updated document",
						"document_id", doc.ObjectID,
						"differences", docsDiffErr,
					)
				}
			} else {
				if m.Verbose {
					m.Logger.Info("document contains the same data",
						"document_id", doc.ObjectID,
					)
				}
			}
		}
	}
}
