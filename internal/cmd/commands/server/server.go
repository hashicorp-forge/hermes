package server

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/hashicorp-forge/hermes/internal/api"
	apiv2 "github.com/hashicorp-forge/hermes/internal/api/v2"
	"github.com/hashicorp-forge/hermes/internal/auth"
	"github.com/hashicorp-forge/hermes/internal/cmd/base"
	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/internal/datadog"
	"github.com/hashicorp-forge/hermes/internal/db"
	"github.com/hashicorp-forge/hermes/internal/jira"
	"github.com/hashicorp-forge/hermes/internal/pkg/doctypes"
	"github.com/hashicorp-forge/hermes/internal/pub"
	"github.com/hashicorp-forge/hermes/internal/server"
	"github.com/hashicorp-forge/hermes/internal/structs"
	"github.com/hashicorp-forge/hermes/pkg/algolia"
	hcd "github.com/hashicorp-forge/hermes/pkg/hashicorpdocs"
	"github.com/hashicorp-forge/hermes/pkg/links"
	"github.com/hashicorp-forge/hermes/pkg/models"
	searchalgolia "github.com/hashicorp-forge/hermes/pkg/search/adapters/algolia"
	gw "github.com/hashicorp-forge/hermes/pkg/workspace/adapters/google"
	"github.com/hashicorp-forge/hermes/web"
	"github.com/hashicorp/go-hclog"
	httptrace "gopkg.in/DataDog/dd-trace-go.v1/contrib/net/http"
	"gopkg.in/DataDog/dd-trace-go.v1/ddtrace/tracer"
	"gorm.io/gorm"
)

type Command struct {
	*base.Command

	flagAddr              string
	flagBaseURL           string
	flagConfig            string
	flagOktaAuthServerURL string
	flagOktaClientID      string
	flagOktaDisabled      bool
}

type endpoint struct {
	pattern string
	handler http.Handler
}

func (c *Command) Synopsis() string {
	return "Run the server"
}

func (c *Command) Help() string {
	return `Usage: hermes server

  This command runs the Hermes web server.` + c.Flags().Help()
}

func (c *Command) Flags() *base.FlagSet {
	f := base.NewFlagSet(flag.NewFlagSet("server", flag.ExitOnError))

	f.StringVar(
		&c.flagAddr, "addr", "127.0.0.1:8000",
		"[HERMES_SERVER_ADDR] Address to bind to for listening.",
	)
	f.StringVar(
		&c.flagBaseURL, "base-url", "http://localhost:8000",
		"[HERMES_BASE_URL] Base URL used for building links.",
	)
	f.StringVar(
		&c.flagConfig, "config", "", "Path to Hermes config file",
	)
	f.StringVar(
		&c.flagOktaAuthServerURL, "okta-auth-server-url", "",
		"[HERMES_SERVER_OKTA_AUTH_SERVER_URL] URL to the Okta authorization server.",
	)
	f.StringVar(
		&c.flagOktaClientID, "okta-client-id", "",
		"[HERMES_SERVER_OKTA_CLIENT_ID] Okta client ID.",
	)
	f.BoolVar(
		&c.flagOktaDisabled, "okta-disabled", false,
		"[HERMES_SERVER_OKTA_DISABLED] Disable Okta authorization.",
	)

	return f
}

func (c *Command) Run(args []string) int {
	f := c.Flags()
	if err := f.Parse(args); err != nil {
		c.UI.Error(fmt.Sprintf("error parsing flags: %v", err))
		return 1
	}

	var (
		cfg *config.Config
		err error
	)
	if c.flagConfig != "" {
		cfg, err = config.NewConfig(c.flagConfig)
		if err != nil {
			c.UI.Error(fmt.Sprintf("error parsing config file: %v: config=%q",
				err, c.flagConfig))
			return 1
		}
	}

	// Get configuration from environment variables if not set on the command
	// line.
	// TODO: make this section more DRY and add tests.
	if val, ok := os.LookupEnv("HERMES_SERVER_ADDR"); ok {
		cfg.Server.Addr = val
	}
	if c.flagAddr != f.Lookup("addr").DefValue {
		cfg.Server.Addr = c.flagAddr
	}
	if val, ok := os.LookupEnv("HERMES_BASE_URL"); ok {
		cfg.BaseURL = val
	}
	if c.flagBaseURL != f.Lookup("base-url").DefValue {
		cfg.BaseURL = c.flagBaseURL
	}
	if val, ok := os.LookupEnv("HERMES_SERVER_OKTA_AUTH_SERVER_URL"); ok {
		cfg.Okta.AuthServerURL = val
	}
	if c.flagOktaAuthServerURL != f.Lookup("okta-auth-server-url").DefValue {
		cfg.Okta.AuthServerURL = c.flagOktaAuthServerURL
	}
	if val, ok := os.LookupEnv("HERMES_SERVER_OKTA_CLIENT_ID"); ok {
		cfg.Okta.ClientID = val
	}
	if c.flagOktaClientID != f.Lookup("okta-client-id").DefValue {
		cfg.Okta.ClientID = c.flagOktaClientID
	}
	if val, ok := os.LookupEnv("HERMES_SERVER_OKTA_DISABLED"); ok {
		if val == "" || val == "false" {
			// Keep Okta enabled if the env var value is an empty string or "false".
		} else {
			cfg.Okta.Disabled = true
		}
	}
	if val, ok := os.LookupEnv("HERMES_SERVER_OKTA_JWT_SIGNER"); ok {
		cfg.Okta.JWTSigner = val
	}
	if c.flagOktaDisabled {
		cfg.Okta.Disabled = true
	}

	// Validate feature flags defined in configuration
	if cfg.FeatureFlags != nil {
		err := config.ValidateFeatureFlags(cfg.FeatureFlags.FeatureFlag)
		if err != nil {
			c.UI.Error(fmt.Sprintf("error initializing server: %v", err))
			return 1
		}
	}

	// Validate other configuration.
	if cfg.Email != nil && cfg.Email.Enabled {
		if cfg.Email.FromAddress == "" {
			c.UI.Error("email from_address must be set if email is enabled")
			return 1
		}
	}

	// Configure logger.
	switch cfg.LogFormat {
	case "json":
		c.Log = hclog.New(&hclog.LoggerOptions{
			JSONFormat: true,
		})
	case "standard":
	case "":
	default:
		c.UI.Error(fmt.Sprintf("invalid value for log format: %s", cfg.LogFormat))
		return 1
	}

	// Build configuration for Okta authentication.
	if !cfg.Okta.Disabled {
		// Check for required Okta configuration.
		if cfg.Okta.AuthServerURL == "" {
			c.UI.Error("error initializing server: Okta authorization server URL is required")
			return 1
		}
		if cfg.Okta.AWSRegion == "" {
			c.UI.Error("error initializing server: Okta AWS region is required")
			return 1
		}
		if cfg.Okta.ClientID == "" {
			c.UI.Error("error initializing server: Okta client ID is required")
			return 1
		}
		if cfg.Okta.JWTSigner == "" {
			c.UI.Error("error initializing server: Okta JWT signer is required")
			return 1
		}
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

	// Initialize Google Workspace service.
	var goog *gw.Service
	// Use Google Workspace service user auth if it is defined in the config.
	if cfg.GoogleWorkspace.Auth != nil {
		// Validate temporary drafts folder is configured if creating docs as user.
		if cfg.GoogleWorkspace.Auth.CreateDocsAsUser &&
			cfg.GoogleWorkspace.TemporaryDraftsFolder == "" {
			c.UI.Error(
				"error initializing server: Google Workspace temporary drafts folder is required if create_docs_as_user is true")
			return 1
		}

		goog = gw.NewFromConfig(cfg.GoogleWorkspace.Auth)
	} else {
		// Use OAuth if Google Workspace auth is not defined in the config.
		goog = gw.New()
	}

	reqOpts := map[interface{}]string{
		cfg.Algolia.AppID:                   "Algolia Application ID is required",
		cfg.Algolia.SearchAPIKey:            "Algolia Search API Key is required",
		cfg.BaseURL:                         "Base URL is required",
		cfg.GoogleWorkspace.DocsFolder:      "Google Workspace Docs Folder is required",
		cfg.GoogleWorkspace.Domain:          "Google Workspace Domain is required",
		cfg.GoogleWorkspace.DraftsFolder:    "Google Workspace Drafts Folder is required",
		cfg.GoogleWorkspace.ShortcutsFolder: "Google Workspace Shortcuts Folder is required",
	}
	for r, msg := range reqOpts {
		if r == "" {
			c.UI.Error(fmt.Sprintf("error initializing server: %s", msg))
			return 1
		}
	}

	// Convert search adapter config to legacy algolia config
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

	// Initialize Algolia search client (legacy - still needed for proxy handler).
	algoSearch, err := algolia.NewSearchClient(algoliaClientCfg)
	if err != nil {
		c.UI.Error(fmt.Sprintf("error initializing Algolia search client: %v", err))
		return 1
	}

	// Initialize Algolia write client (legacy - still needed for some operations).
	algoWrite, err := algolia.New(algoliaClientCfg)
	if err != nil {
		c.UI.Error(fmt.Sprintf("error initializing Algolia write client: %v", err))
		return 1
	}

	// Initialize modern search provider adapter.
	searchAdapterCfg := &searchalgolia.Config{
		AppID:           cfg.Algolia.AppID,
		WriteAPIKey:     cfg.Algolia.WriteAPIKey,
		DocsIndexName:   cfg.Algolia.DocsIndexName,
		DraftsIndexName: cfg.Algolia.DraftsIndexName,
	}
	searchProvider, err := searchalgolia.NewAdapter(searchAdapterCfg)
	if err != nil {
		c.UI.Error(fmt.Sprintf("error initializing search provider: %v", err))
		return 1
	}

	// Initialize modern workspace provider adapter.
	workspaceProvider := gw.NewAdapter(goog)

	// Initialize Jira service.
	var jiraSvc *jira.Service
	if cfg.Jira != nil && cfg.Jira.Enabled {
		jiraSvc, err = jira.NewService(*cfg.Jira)
		if err != nil {
			c.UI.Error(fmt.Sprintf("error initializing Jira service: %v", err))
			return 1
		}
	}

	// Initialize database.
	if val, ok := os.LookupEnv("HERMES_SERVER_POSTGRES_PASSWORD"); ok {
		cfg.Postgres.Password = val
	}
	db, err := db.NewDB(*cfg.Postgres)
	if err != nil {
		c.UI.Error(fmt.Sprintf("error initializing database: %v", err))
		return 1
	}

	// Register document types.
	// for _, d := range cfg.DocumentTypes.DocumentType {
	// 	if err := models.RegisterDocumentType(*d, db); err != nil {
	// 		c.UI.Error(fmt.Sprintf("error registering document type: %v", err))
	// 		return 1
	// 	}
	// }
	if err := registerDocumentTypes(*cfg, db); err != nil {
		c.UI.Error(fmt.Sprintf("error registering document types: %v", err))
		return 1
	}

	// Register products.
	if err := registerProducts(cfg, algoWrite, db); err != nil {
		c.UI.Error(fmt.Sprintf("error registering products: %v", err))
		return 1
	}

	// Register document types.
	// TODO: remove this and use the database for all document type lookups.
	docTypes := map[string]hcd.Doc{
		"frd": &hcd.FRD{},
		"prd": &hcd.PRD{},
		"rfc": &hcd.RFC{},
	}
	for name, dt := range docTypes {
		if err = doctypes.Register(name, dt); err != nil {
			c.UI.Error(fmt.Sprintf("error registering %q doc type: %v", name, err))
			return 1
		}
	}

	type serveMux interface {
		Handle(pattern string, handler http.Handler)
		ServeHTTP(http.ResponseWriter, *http.Request)
	}
	var mux serveMux
	if dd.Enabled {
		mux = httptrace.NewServeMux()
	} else {
		mux = http.NewServeMux()
	}

	srv := server.Server{
		SearchProvider:    searchProvider,
		WorkspaceProvider: workspaceProvider,
		Config:            cfg,
		DB:                db,
		Jira:              jiraSvc,
		Logger:            c.Log,
	}

	// Define handlers for authenticated endpoints.
	authenticatedEndpoints := []endpoint{
		// Algolia proxy.
		{"/1/indexes/",
			algolia.AlgoliaProxyHandler(algoSearch, algoliaClientCfg, c.Log)},

		// API v1.
		{"/api/v1/approvals/",
			api.ApprovalHandler(cfg, c.Log, srv.SearchProvider, srv.WorkspaceProvider, db)},
		{"/api/v1/document-types", api.DocumentTypesHandler(*cfg, c.Log)},
		{"/api/v1/documents/",
			api.DocumentHandler(cfg, c.Log, srv.SearchProvider, srv.WorkspaceProvider, db)},
		{"/api/v1/drafts",
			api.DraftsHandler(cfg, c.Log, algoSearch, algoWrite, goog, db)},
		{"/api/v1/drafts/",
			api.DraftsDocumentHandler(cfg, c.Log, algoSearch, algoWrite, goog, db)},
		{"/api/v1/jira/issue/picker", apiv2.JiraIssuePickerHandler(srv)},
		{"/api/v1/jira/issues/", apiv2.JiraIssueHandler(srv)},
		{"/api/v1/me", api.MeHandler(c.Log, goog)},
		{"/api/v1/me/recently-viewed-docs",
			api.MeRecentlyViewedDocsHandler(cfg, c.Log, db)},
		{"/api/v1/me/subscriptions",
			api.MeSubscriptionsHandler(cfg, c.Log, goog, db)},
		{"/api/v1/people", api.PeopleDataHandler(cfg, c.Log, goog)},
		{"/api/v1/products", api.ProductsHandler(cfg, algoSearch, c.Log)},
		{"/api/v1/projects", apiv2.ProjectsHandler(srv)},
		{"/api/v1/projects/", apiv2.ProjectHandler(srv)},
		{"/api/v1/reviews/",
			api.ReviewHandler(cfg, c.Log, algoWrite, srv.SearchProvider, srv.WorkspaceProvider, db)},
		{"/api/v1/web/analytics", api.AnalyticsHandler(c.Log)},

		// API v2.
		{"/api/v2/approvals/", apiv2.ApprovalsHandler(srv)},
		{"/api/v2/document-types", apiv2.DocumentTypesHandler(srv)},
		{"/api/v2/documents/", apiv2.DocumentHandler(srv)},
		{"/api/v2/drafts", apiv2.DraftsHandler(srv)},
		{"/api/v2/drafts/", apiv2.DraftsDocumentHandler(srv)},
		{"/api/v2/groups", apiv2.GroupsHandler(srv)},
		{"/api/v2/jira/issues/", apiv2.JiraIssueHandler(srv)},
		{"/api/v2/jira/issue/picker", apiv2.JiraIssuePickerHandler(srv)},
		{"/api/v2/me", apiv2.MeHandler(srv)},
		{"/api/v2/me/recently-viewed-docs", apiv2.MeRecentlyViewedDocsHandler(srv)},
		{"/api/v2/me/recently-viewed-projects",
			apiv2.MeRecentlyViewedProjectsHandler(srv)},
		{"/api/v2/me/subscriptions", apiv2.MeSubscriptionsHandler(srv)},
		{"/api/v2/people", apiv2.PeopleDataHandler(srv)},
		{"/api/v2/products", apiv2.ProductsHandler(srv)},
		{"/api/v2/projects", apiv2.ProjectsHandler(srv)},
		{"/api/v2/projects/", apiv2.ProjectHandler(srv)},
		{"/api/v2/reviews/", apiv2.ReviewsHandler(srv)},
		{"/api/v2/web/analytics", apiv2.AnalyticsHandler(srv)},
	}

	// Define handlers for unauthenticated endpoints.
	unauthenticatedEndpoints := []endpoint{
		{"/health", healthHandler()},
		{"/pub/", http.StripPrefix("/pub/", pub.Handler())},
	}

	// Web endpoints are conditionally authenticated based on if Okta is enabled.
	webEndpoints := []endpoint{
		{"/", web.Handler()},
		{"/api/v1/web/config", web.ConfigHandler(cfg, algoSearch, c.Log)},
		{"/api/v2/web/config", web.ConfigHandler(cfg, algoSearch, c.Log)},
		{"/l/", links.RedirectHandler(algoSearch, algoliaClientCfg, c.Log)},
	}

	// If Okta is enabled, add the web endpoints for the single page app as
	// authenticated endpoints.
	if cfg.Okta != nil && !cfg.Okta.Disabled {
		authenticatedEndpoints = append(authenticatedEndpoints, webEndpoints...)
	} else {
		// If Okta is disabled, we need to add the web endpoints for the SPA as
		// unauthenticated endpoints so the application will load.
		unauthenticatedEndpoints = append(unauthenticatedEndpoints, webEndpoints...)
	}

	// Register handlers.
	for _, e := range authenticatedEndpoints {
		mux.Handle(
			e.pattern,
			auth.AuthenticateRequest(*cfg, goog, c.Log, e.handler),
		)
	}
	for _, e := range unauthenticatedEndpoints {
		mux.Handle(e.pattern, e.handler)
	}

	server := &http.Server{
		Addr:    cfg.Server.Addr,
		Handler: mux,
	}
	go func() {
		c.Log.Info(fmt.Sprintf("listening on %s...", cfg.Server.Addr))

		if err := server.ListenAndServe(); err != http.ErrServerClosed {
			c.Log.Error(fmt.Sprintf("error starting listener: %v", err))
			os.Exit(1)
		}
	}()

	return c.WaitForInterrupt(c.ShutdownServer(server))
}

// healthHandler responds with the health of the service.
func healthHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})
}

// ShutdownServer gracefully shuts down the HTTP server.
func (c *Command) ShutdownServer(s *http.Server) func() {
	return func() {
		c.Log.Debug("shutting down HTTP server...")
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		if err := s.Shutdown(ctx); err != nil {
			c.Log.Error(fmt.Sprintf("error shutting down HTTP server: %v", err))
		}
	}
}

// registerDocumentTypes registers all products configured in the application
// config in the database.
func registerDocumentTypes(cfg config.Config, db *gorm.DB) error {
	for _, d := range cfg.DocumentTypes.DocumentType {
		// Marshal Checks to JSON.
		checksJSON, err := json.Marshal(d.Checks)
		if err != nil {
			return fmt.Errorf("error marshaling checks to JSON: %w", err)
		}

		// Convert custom fields to model's version.
		var cfs []models.DocumentTypeCustomField
		for _, c := range d.CustomFields {
			cf := models.DocumentTypeCustomField{
				Name:     c.Name,
				ReadOnly: c.ReadOnly,
			}

			// Convert custom field type.
			t := strings.ToLower(c.Type)
			switch t {
			case "string":
				cf.Type = models.DocumentTypeCustomFieldType(
					models.StringDocumentTypeCustomFieldType)
			case "person":
				cf.Type = models.DocumentTypeCustomFieldType(
					models.PersonDocumentTypeCustomFieldType)
			case "people":
				cf.Type = models.DocumentTypeCustomFieldType(
					models.PeopleDocumentTypeCustomFieldType)
			case "":
				return fmt.Errorf("missing document type custom field")
			default:
				return fmt.Errorf("invalid document type custom field: %s", t)
			}

			cfs = append(cfs, cf)
		}

		dt := models.DocumentType{
			Name:         d.Name,
			LongName:     d.LongName,
			Description:  d.Description,
			FlightIcon:   d.FlightIcon,
			Checks:       checksJSON,
			CustomFields: cfs,
		}

		if d.MoreInfoLink != nil {
			dt.MoreInfoLinkText = d.MoreInfoLink.Text
			dt.MoreInfoLinkURL = d.MoreInfoLink.URL
		}

		// Upsert document type.
		if err := dt.Upsert(db); err != nil {
			return fmt.Errorf("error upserting document type: %w", err)
		}
	}

	return nil
}

// registerProducts registers all products configured in the application config
// in the database and Algolia.
// TODO: products are currently needed in Algolia for legacy reasons - remove
// this when possible.
func registerProducts(
	cfg *config.Config, algo *algolia.Client, db *gorm.DB) error {

	productsObj := structs.Products{
		ObjectID: "products",
		Data:     make(map[string]structs.ProductData, 0),
	}

	for _, p := range cfg.Products.Product {
		// Upsert product in database.
		pm := models.Product{
			Name:         p.Name,
			Abbreviation: p.Abbreviation,
		}
		if err := pm.Upsert(db); err != nil {
			return fmt.Errorf("error upserting product: %w", err)
		}

		// Add product to Algolia products object.
		productsObj.Data[p.Name] = structs.ProductData{
			Abbreviation: p.Abbreviation,
		}
	}

	// Save Algolia products object.
	res, err := algo.Internal.SaveObject(&productsObj)
	if err != nil {
		return fmt.Errorf("error saving Algolia products object: %w", err)
	}
	err = res.Wait()
	if err != nil {
		return fmt.Errorf("error saving Algolia products object: %w", err)
	}

	return nil
}
