package indexer

import (
	"flag"
	"fmt"
	"strings"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/hashicorp-forge/hermes/internal/cmd/base"
	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/internal/datadog"
	"github.com/hashicorp-forge/hermes/internal/db"
	"github.com/hashicorp-forge/hermes/internal/indexer"
	"github.com/hashicorp-forge/hermes/pkg/algolia"
	gw "github.com/hashicorp-forge/hermes/pkg/googleworkspace"
	sp "github.com/hashicorp-forge/hermes/pkg/sharepointhelper"
	"github.com/hashicorp/go-hclog"
	"gopkg.in/DataDog/dd-trace-go.v1/ddtrace/tracer"
)

type Command struct {
	*base.Command

	flagConfig string
	flagDryRun bool
}

func (c *Command) Synopsis() string {
	return "Run the indexer"
}

func (c *Command) Help() string {
	return `Usage: hermes indexer

This command runs the indexer.

The indexer is a background process that indexes documents in Algolia, refreshes
document headers, sends notifications, etc.` + c.Flags().Help()
}

func (c *Command) Flags() *base.FlagSet {
	f := base.NewFlagSet(flag.NewFlagSet("indexer", flag.ExitOnError))

	f.StringVar(
		&c.flagConfig, "config", "", "Path to config file",
	)
	f.BoolVar(
		&c.flagDryRun, "dry-run", false,
		"Print document data instead of indexing",
	)
	return f
}

func (c *Command) Run(args []string) int {
	log, ui := c.Log, c.UI

	// Parse flags.
	f := c.Flags()
	if err := f.Parse(args); err != nil {
		ui.Error(fmt.Sprintf("error parsing flags: %v", err))
		return 1
	}

	// Validate flags.
	if err := validation.ValidateStruct(c,
		validation.Field(
			&c.flagConfig,
			validation.Required.Error("config argument is required")),
	); err != nil {
		// Remove the field name from the error string.
		errStr := strings.SplitAfter(err.Error(), ": ")[1]
		ui.Error("error parsing flags: " + errStr)
		return 1
	}

	// Parse configuration file.
	cfg, err := config.NewConfig(c.flagConfig)
	if err != nil {
		ui.Error(fmt.Sprintf("error parsing configuration file: %v", err))
		return 1
	}

	// Configure logger.
	switch cfg.LogFormat {
	case "json":
		log = hclog.New(&hclog.LoggerOptions{
			JSONFormat: true,
		})
	case "standard":
	case "":
	default:
		ui.Error(fmt.Sprintf("invalid value for log format: %s", cfg.LogFormat))
		return 1
	}

	// Initialize Datadog.
	dd := datadog.NewConfig(*cfg)
	if dd.Enabled {
		tracerOpts := []tracer.StartOption{
			tracer.WithLogStartup(false),
		}

		if dd.Env != "" {
			tracerOpts = append(tracerOpts, tracer.WithEnv(dd.Env))
		}
		if dd.Service != "" {
			tracerOpts = append(tracerOpts, tracer.WithService(dd.Service))
		}
		if dd.ServiceVersion != "" {
			tracerOpts = append(
				tracerOpts,
				tracer.WithServiceVersion(dd.ServiceVersion),
			)
		}

		tracer.Start(tracerOpts...)
	}

	// Initialize database connection.
	db, err := db.NewDB(*cfg.Postgres)
	if err != nil {
		ui.Error(fmt.Sprintf("error initializing database: %v", err))
		return 1
	}

	// Initialize Algolia client.
	var algo *algolia.Client
	algo, err = algolia.New(cfg.Algolia)
	if err != nil {
		c.UI.Error(fmt.Sprintf("error initializing Algolia: %v", err))
		return 1
	}

	// Initialize SharePoint or Google Workspace service.
	var sharepointSvc *sp.Service
	var goog *gw.Service
	if cfg.SharePoint != nil && !cfg.SharePoint.Disabled {
		// Initialize SharePoint service.
		sharepointSvc = &sp.Service{
			ClientID:     cfg.SharePoint.ClientID,
			ClientSecret: cfg.SharePoint.ClientSecret,
			TenantID:     cfg.SharePoint.TenantID,
			SiteID:       cfg.SharePoint.SiteID,  // Add SiteID from config
			DriveID:      cfg.SharePoint.DriveID, // Add DriveID from config
		}

		// Get a valid SharePoint token.
		token, err := sharepointSvc.GetToken()
		if err != nil {
			ui.Error(fmt.Sprintf("error initializing SharePoint service: %v", err))
			return 1
		}
		sharepointSvc.AccessToken = token
		log.Info("Successfully initialized SharePoint service.")
	} else if cfg.GoogleWorkspace.Auth != nil {
		// Use Google Workspace auth if it is defined in the config.
		goog = gw.NewFromConfig(cfg.GoogleWorkspace.Auth)
		log.Info("Successfully initialized Google Workspace service.")
	} else {
		// Use OAuth if Google Workspace auth is not defined in the config.
		goog = gw.New()
		log.Info("Successfully initialized Google Workspace service with OAuth.")
	}

	// Configure indexer options.
	idxOpts := []indexer.IndexerOption{
		indexer.WithAlgoliaClient(algo),
		indexer.WithBaseURL(cfg.BaseURL),
		indexer.WithDatabase(db),
		indexer.WithDocumentTypes(cfg.DocumentTypes.DocumentType),
		indexer.WithLogger(log),
	}

	// Add SharePoint or Google Workspace-specific options.
	if sharepointSvc != nil {
		idxOpts = append(idxOpts,
			indexer.WithSharePointService(sharepointSvc),
			indexer.WithDocumentsFolderID(cfg.SharePoint.DocsFolder), // Use SharePoint DocsFolder
			indexer.WithDraftsFolderID(cfg.SharePoint.DraftsFolder),  // Use SharePoint DraftsFolder
		)
	} else {
		idxOpts = append(idxOpts,
			indexer.WithGoogleWorkspaceService(goog),
			indexer.WithDocumentsFolderID(cfg.GoogleWorkspace.DocsFolder),
			indexer.WithDraftsFolderID(cfg.GoogleWorkspace.DraftsFolder),
		)
	}

	// Add additional indexer options.
	if cfg.Indexer.MaxParallelDocs != 0 {
		idxOpts = append(idxOpts,
			indexer.WithMaxParallelDocuments(cfg.Indexer.MaxParallelDocs))
	}
	if cfg.Indexer.UpdateDocHeaders {
		idxOpts = append(idxOpts,
			indexer.WithUpdateDocumentHeaders(true))
	}
	if cfg.Indexer.UpdateDraftHeaders {
		idxOpts = append(idxOpts,
			indexer.WithUpdateDraftHeaders(true))
	}
	if cfg.Indexer.UseDatabaseForDocumentData {
		idxOpts = append(idxOpts,
			indexer.WithUseDatabaseForDocumentData(true))
	}

	// Create the indexer.
	idx, err := indexer.NewIndexer(cfg, idxOpts...)
	if err != nil {
		ui.Error(fmt.Sprintf("error creating indexer: %v", err))
		return 1
	}

	ui.Info("starting indexer...")
	go func() int {
		if err := idx.Run(); err != nil {
			ui.Error(err.Error())
			// TODO: get this return value from indexer.Run().
			return 1
		}
		return 0
	}()
	return c.WaitForInterrupt(func() {})
}
