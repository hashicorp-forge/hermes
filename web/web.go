package web

import (
	"embed"
	"encoding/json"
	"io/fs"
	"net/http"
	"strings"

	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/internal/pkg/featureflags"
	"github.com/hashicorp-forge/hermes/internal/version"
	"github.com/hashicorp-forge/hermes/pkg/algolia"
	pkgauth "github.com/hashicorp-forge/hermes/pkg/auth"
	"github.com/hashicorp/go-hclog"
)

//go:embed dist
var content embed.FS

func Handler() http.Handler {
	return webHandler(http.FileServer(httpFileSystem()))
}

func httpFileSystem() http.FileSystem {
	return http.FS(fileSystem())
}

func fileSystem() fs.FS {
	f, err := fs.Sub(content, "dist")
	if err != nil {
		panic(err)
	}

	return f
}

// webHandler is middleware for serving our single-page application.
func webHandler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Only allow GET requests.
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}

		// Serve `/index.html` if there isn't an extension in the URL path.
		// Without this, browser refreshes on SPA routes will 404.
		if ext := strings.LastIndex(r.URL.Path, "."); ext == -1 {
			r.URL.Path = "/"
		}

		next.ServeHTTP(w, r)
	})
}

type ConfigResponse struct {
	AlgoliaDocsIndexName     string          `json:"algolia_docs_index_name"`
	AlgoliaDraftsIndexName   string          `json:"algolia_drafts_index_name"`
	AlgoliaInternalIndexName string          `json:"algolia_internal_index_name"`
	AlgoliaProjectsIndexName string          `json:"algolia_projects_index_name"`
	CreateDocsAsUser         bool            `json:"create_docs_as_user"`
	FeatureFlags             map[string]bool `json:"feature_flags"`
	GoogleAnalyticsTagID     string          `json:"google_analytics_tag_id"`
	GoogleOAuth2ClientID     string          `json:"google_oauth2_client_id"`
	GoogleOAuth2HD           string          `json:"google_oauth2_hd"`
	GroupApprovals           bool            `json:"group_approvals"`
	JiraURL                  string          `json:"jira_url"`
	ShortLinkBaseURL         string          `json:"short_link_base_url"`
	SkipGoogleAuth           bool            `json:"skip_google_auth"`
	SupportLinkURL           string          `json:"support_link_url"`
	ShortRevision            string          `json:"short_revision"`
	Version                  string          `json:"version"`
}

// ConfigHandler returns runtime configuration for the Hermes frontend.
func ConfigHandler(
	cfg *config.Config,
	a *algolia.Client,
	log hclog.Logger,
) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Only allow GET requests.
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}

		// Set and toggle the feature flags defined
		// in the configuration
		featureFlags := featureflags.SetAndToggle(
			cfg.FeatureFlags,
			a,
			// Use the "x-amzn-oidc-identity" header if set
			// as id to be hashed and toggle flags.
			r.Header.Get("x-amzn-oidc-identity"),
			// Get user email from value set by auth middleware
			pkgauth.MustGetUserEmail(r.Context()),
			log,
		)

		// Trim last "/"
		shortLinkBaseURL := strings.TrimSuffix(cfg.ShortenerBaseURL, "/")
		// Check if shortener base URL was set, if not
		// use application base URL to create
		// short link base URL.
		if shortLinkBaseURL == "" {
			shortLinkBaseURL = strings.TrimSuffix(cfg.BaseURL, "/") + "/l"
		}

		// Skip Google auth if Okta is not disabled in the config.
		skipGoogleAuth := false
		if cfg.Okta == nil || (cfg.Okta != nil && !cfg.Okta.Disabled) {
			skipGoogleAuth = true
		}

		// Set CreateDocsAsUser if enabled in the config.
		createDocsAsUser := false
		if cfg.GoogleWorkspace.Auth != nil &&
			cfg.GoogleWorkspace.Auth.CreateDocsAsUser {
			createDocsAsUser = true
		}

		// Set GroupApprovals if enabled in the config.
		groupApprovals := false
		if cfg.GoogleWorkspace.GroupApprovals != nil &&
			cfg.GoogleWorkspace.GroupApprovals.Enabled {
			groupApprovals = true
		}

		// Set JiraURL if enabled in the config.
		jiraURL := ""
		if cfg.Jira != nil && cfg.Jira.Enabled {
			jiraURL = cfg.Jira.URL
		}

		response := &ConfigResponse{
			AlgoliaDocsIndexName:     cfg.Algolia.DocsIndexName,
			AlgoliaDraftsIndexName:   cfg.Algolia.DraftsIndexName,
			AlgoliaInternalIndexName: cfg.Algolia.InternalIndexName,
			AlgoliaProjectsIndexName: cfg.Algolia.ProjectsIndexName,
			CreateDocsAsUser:         createDocsAsUser,
			FeatureFlags:             featureFlags,
			GoogleAnalyticsTagID:     cfg.GoogleAnalyticsTagID,
			GoogleOAuth2ClientID:     cfg.GoogleWorkspace.OAuth2.ClientID,
			GoogleOAuth2HD:           cfg.GoogleWorkspace.OAuth2.HD,
			GroupApprovals:           groupApprovals,
			JiraURL:                  jiraURL,
			ShortLinkBaseURL:         shortLinkBaseURL,
			SkipGoogleAuth:           skipGoogleAuth,
			SupportLinkURL:           cfg.SupportLinkURL,
			ShortRevision:            version.GetShortRevision(),
			Version:                  version.GetVersion(),
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)

		enc := json.NewEncoder(w)
		err := enc.Encode(response)
		if err != nil {
			log.Error("error encoding web config response", "error", err)
			http.Error(w, "Error encoding web config response",
				http.StatusInternalServerError)
			return
		}
	})
}
