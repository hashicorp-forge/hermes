package web

import (
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"net/http"
	"strings"

	"github.com/hashicorp-forge/hermes/internal/config"
	"github.com/hashicorp-forge/hermes/internal/pkg/featureflags"
	"github.com/hashicorp-forge/hermes/internal/version"
	"github.com/hashicorp-forge/hermes/pkg/algolia"
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
	AlgoliaDocsIndexName     string           `json:"algolia_docs_index_name"`
	AlgoliaDraftsIndexName   string           `json:"algolia_drafts_index_name"`
	AlgoliaInternalIndexName string           `json:"algolia_internal_index_name"`
	AlgoliaProjectsIndexName string           `json:"algolia_projects_index_name"`
	CreateDocsAsUser         bool             `json:"create_docs_as_user"`
	FeatureFlags             map[string]bool  `json:"feature_flags"`
	GoogleAnalyticsTagID     string           `json:"google_analytics_tag_id"`
	GoogleOAuth2ClientID     string           `json:"google_oauth2_client_id"`
	GoogleOAuth2HD           string           `json:"google_oauth2_hd"`
	GroupApprovals           bool             `json:"group_approvals"`
	JiraURL                  string           `json:"jira_url"`
	Microsoft                *MicrosoftConfig `json:"microsoft,omitempty"`
	ShortLinkBaseURL         string           `json:"short_link_base_url"`
	SkipGoogleAuth           bool             `json:"skip_google_auth"`
	SkipMicrosoftAuth        bool             `json:"skip_microsoft_auth"`
	SupportLinkURL           string           `json:"support_link_url"`
	ShortRevision            string           `json:"short_revision"`
	Version                  string           `json:"version"`
}

type MicrosoftConfig struct {
	ClientID    string `json:"clientId"`
	TenantID    string `json:"tenantId"`
	RedirectURI string `json:"redirectUri"`
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
			// Get user email from value set by OIDC middleware
			fmt.Sprintf("%v", r.Context().Value("userEmail")),
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

		// Skip Google auth if any non-Google auth method is configured.
		// When OIDC ALB, Okta, or SharePoint is configured, Google
		// auth tokens are not needed (those systems handle auth).
		skipGoogleAuth := false
		if (cfg.OidcAlb != nil && !cfg.OidcAlb.Disabled) ||
			(cfg.Okta != nil && !cfg.Okta.Disabled) ||
			cfg.SharePoint != nil {
			skipGoogleAuth = true
		}

		// Skip Microsoft auth when:
		// - OIDC ALB handles auth (ALB not disabled), OR
		// - SharePoint is not configured (Google mode — no Microsoft auth needed)
		skipMicrosoftAuth := false
		if (cfg.OidcAlb != nil && !cfg.OidcAlb.Disabled) || cfg.SharePoint == nil {
			skipMicrosoftAuth = true
		}

		// Set CreateDocsAsUser if enabled in the config.
		createDocsAsUser := false
		if cfg.GoogleWorkspace.Auth != nil &&
			cfg.GoogleWorkspace.Auth.CreateDocsAsUser {
			createDocsAsUser = true
		}

		// Set GroupApprovals if enabled in the config.
		groupApprovals := false
		if cfg.SharePoint != nil &&
			cfg.SharePoint.GroupApprovals != nil &&
			cfg.SharePoint.GroupApprovals.Enabled {
			groupApprovals = true
		}

		// Set JiraURL if enabled in the config.
		jiraURL := ""
		if cfg.Jira != nil && cfg.Jira.Enabled {
			jiraURL = cfg.Jira.URL
		}

		var microsoftConfig *MicrosoftConfig
		if cfg.SharePoint != nil {
			microsoftConfig = &MicrosoftConfig{
				ClientID:    cfg.SharePoint.ClientID,
				TenantID:    cfg.SharePoint.TenantID,
				RedirectURI: cfg.SharePoint.RedirectURI,
			}
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
			Microsoft:                microsoftConfig,
			ShortLinkBaseURL:         shortLinkBaseURL,
			SkipGoogleAuth:           skipGoogleAuth,
			SkipMicrosoftAuth:        skipMicrosoftAuth,
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
