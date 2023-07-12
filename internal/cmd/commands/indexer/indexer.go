package indexer

import (
	"flag"
	"fmt"
	"os"
	"strings"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/hashicorp-forge/hermes/internal/cmd/base"
	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/internal/db"
	"github.com/hashicorp-forge/hermes/internal/indexer"
	"github.com/hashicorp-forge/hermes/pkg/algolia"
	gw "github.com/hashicorp-forge/hermes/pkg/googleworkspace"
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

	/* Remove this just for explicitly setting up the env variables*/
	// err1 := godotenv.Load()
	// if err1 != nil {
	// 	panic("Error loading .env file")
	// }

	// Access and print the environment variables
	//fmt.Println(os.LookupEnv("ALGOLIA_APPLICATION_ID"))
	//panic("")
	//fmt.Println(os.Getenv("ALGOLIA_SEARCH_API_KEY"))
	//fmt.Println(os.Getenv("ALGOLIA_WRITE_API_KEY"))
	//fmt.Println(os.Getenv("GOOGLE_WORKSPACE_OAUTH2_CLIENT_ID"))
	//fmt.Println(os.Getenv("GOOGLE_WORKSPACE_OAUTH2_HD"))
	//fmt.Println(os.Getenv("GOOGLE_WORKSPACE_OAUTH2_REDIRECT_URI"))
	//fmt.Println(os.Getenv("POSTGRES_PASSWORD"))
	//fmt.Println(os.Getenv("POSTGRES_USER"))

	// Get the sensitive details if present in the environment
	if val, ok := os.LookupEnv("ALGOLIA_APPLICATION_ID"); ok {
		cfg.Algolia.ApplicationID = val
	} else {
		c.UI.Error("ALGOLIA_APPLICATION_ID must be provided as an env variable!")
		return 1
	}
	if val, ok := os.LookupEnv("ALGOLIA_SEARCH_API_KEY"); ok {
		cfg.Algolia.SearchAPIKey = val
	} else {
		c.UI.Error("ALGOLIA_SEARCH_API_KEY must be provided as an env variable!")
		return 1
	}

	if val, ok := os.LookupEnv("ALGOLIA_WRITE_API_KEY"); ok {
		cfg.Algolia.WriteAPIKey = val
	} else {
		c.UI.Error("ALGOLIA_SEARCH_API_KEY must be provided as an env variable!")
		return 1
	}
	if val, ok := os.LookupEnv("GOOGLE_WORKSPACE_OAUTH2_CLIENT_ID"); ok {
		cfg.GoogleWorkspace.OAuth2.ClientID = val
	} else {
		c.UI.Error("GOOGLE_WORKSPACE_OAUTH2_CLIENT_ID must be provided as an env variable!")
		return 1
	}

	if val, ok := os.LookupEnv("GOOGLE_WORKSPACE_OAUTH2_HD"); ok {
		cfg.GoogleWorkspace.OAuth2.HD = val
	} else {
		c.UI.Error("GOOGLE_WORKSPACE_OAUTH2_HD must be provided as an env variable!")
		return 1
	}
	if val, ok := os.LookupEnv("GOOGLE_WORKSPACE_OAUTH2_REDIRECT_URI"); ok {
		cfg.GoogleWorkspace.OAuth2.RedirectURI = val
	} else {
		c.UI.Error("GOOGLE_WORKSPACE_OAUTH2_REDIRECT_URI must be provided as an env variable!")
		return 1
	}
	if val, ok := os.LookupEnv("POSTGRES_PASSWORD"); ok {
		cfg.Postgres.Password = val
	} else {
		c.UI.Error("POSTGRES_PASSWORD must be provided as an env variable!")
		return 1
	}

	if val, ok := os.LookupEnv("POSTGRES_USER"); ok {
		cfg.Postgres.User = val
	} else {
		c.UI.Error("POSTGRES_USER_Name must be provided as an env variable!")
		return 1
	}

	if val, ok := os.LookupEnv("POSTGRES_DBNAME"); ok {
		cfg.Postgres.DBName = val
	} else {
		c.UI.Error("POSTGRES_dbname must be provided as an env variable!")
		return 1
	}
	if val, ok := os.LookupEnv("POSTGRES_HOST"); ok {
		cfg.Postgres.Host = val
	} else {
		c.UI.Error("POSTGRES_host must be provided as an env variable!")
		return 1
	}

	if val, ok := os.LookupEnv("GOOGLE_WORKSPACE_AUTH_CLIENT_EMAIL"); ok {
		cfg.GoogleWorkspace.Auth.ClientEmail = val
	} else {
		c.UI.Error("GOOGLE_WORKSPACE_AUTH_CLIENT_EMAIL must be provided as an env variable!")
		return 1
	}
	if val, ok := os.LookupEnv("GOOGLE_WORKSPACE_AUTH_PRIVATE_KEY"); ok {
		cfg.GoogleWorkspace.Auth.PrivateKey = val
	} else {
		c.UI.Error("GOOGLE_WORKSPACE_AUTH_PRIVATE_KEY must be provided as an env variable!")
		return 1
	}
	if val, ok := os.LookupEnv("GOOGLE_WORKSPACE_AUTH_SUBJECT"); ok {
		cfg.GoogleWorkspace.Auth.Subject = val
	} else {
		c.UI.Error("GOOGLE_WORKSPACE_AUTH_SUBJECT must be provided as an env variable!")
		return 1
	}

	// scanning doc folder drive ids
	if val, ok := os.LookupEnv("DOCS_DRIVE_FOLDER_ID"); ok {
		cfg.GoogleWorkspace.DocsFolder = val
	} else {
		c.UI.Error("DOCS_DRIVE_FOLDER_ID must be provided as an env variable!")
		return 1
	}
	if val, ok := os.LookupEnv("DRAFTS_DRIVE_FOLDER_ID"); ok {
		cfg.GoogleWorkspace.DraftsFolder = val
	} else {
		c.UI.Error("DRAFTS_DRIVE_FOLDER_ID must be provided as an env variable!")
		return 1
	}
	if val, ok := os.LookupEnv("SHORTCUTS_DRIVE_FOLDER_ID"); ok {
		cfg.GoogleWorkspace.ShortcutsFolder = val
	} else {
		c.UI.Error("SHORTCUTS_DRIVE_FOLDER_ID must be provided as an env variable!")
		return 1
	}
	if val, ok := os.LookupEnv("EMAIL_FROM_ADDRESS"); ok {
		cfg.Email.FromAddress = val
	} else {
		c.UI.Error("EMAIL_FROM_ADDRESS must be provided as an env variable!")
		return 1
	}

	/* Scanned all env variables successfully */

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

	// Initialize Google Workspace service.
	var goog *gw.Service
	if cfg.GoogleWorkspace.Auth != nil {
		// Use Google Workspace auth if it is defined in the config.
		goog = gw.NewFromConfig(cfg.GoogleWorkspace.Auth)
	} else {
		// Use OAuth if Google Workspace auth is not defined in the config.
		goog = gw.New()
	}

	idxOpts := []indexer.IndexerOption{
		indexer.WithAlgoliaClient(algo),
		indexer.WithBaseURL(cfg.BaseURL),
		indexer.WithDatabase(db),
		indexer.WithDocumentsFolderID(cfg.GoogleWorkspace.DocsFolder),
		indexer.WithDraftsFolderID(cfg.GoogleWorkspace.DraftsFolder),
		indexer.WithGoogleWorkspaceService(goog),
		indexer.WithLogger(log),
	}
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
	idx, err := indexer.NewIndexer(idxOpts...)
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
