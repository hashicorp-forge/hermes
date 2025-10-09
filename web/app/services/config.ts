import Service from "@ember/service";
import { tracked } from "@glimmer/tracking";
import config, { HermesConfig } from "hermes/config/environment";

export default class ConfigService extends Service {
  @tracked config = {
    algolia_docs_index_name: config.algolia.docsIndexName,
    algolia_drafts_index_name: config.algolia.draftsIndexName,
    algolia_internal_index_name: config.algolia.internalIndexName,
    algolia_projects_index_name: config.algolia.projectsIndexName,
    api_version: "v2", // Always use v2 API
    auth_provider: "google" as "google" | "okta" | "dex", // Runtime auth provider selection
    create_docs_as_user: config.createDocsAsUser,
    dex_issuer_url: "",
    dex_client_id: "",
    dex_redirect_url: "",
    feature_flags: config.featureFlags,
    google_doc_folders: config.google.docFolders ?? "",
    short_link_base_url: config.shortLinkBaseURL,
    skip_google_auth: config.skipGoogleAuth, // Deprecated: use auth_provider
    google_analytics_tag_id: undefined,
    jira_url: config.jiraURL,
    support_link_url: config.supportLinkURL,
    version: config.version,
    short_revision: config.shortRevision,
    group_approvals: config.groupApprovals,
    workspace_provider: "google" as "google" | "local", // Runtime workspace provider selection
  };

  setConfig(param: HermesConfig) {
    // Merge backend config into existing config (using tracked property reactivity)
    this.config = { ...this.config, ...param };
    
    // Always use v2 API
    this.config["api_version"] = "v2";
  }
}

declare module "@ember/service" {
  interface Registry {
    config: ConfigService;
  }
}
