import Service from "@ember/service";
import config, { HermesConfig } from "hermes/config/environment";

export default class ConfigService extends Service {
  config = {
    algolia_docs_index_name: config.algolia.docsIndexName,
    algolia_drafts_index_name: config.algolia.draftsIndexName,
    algolia_internal_index_name: config.algolia.internalIndexName,
    algolia_projects_index_name: config.algolia.projectsIndexName,
    api_version: "v1",
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
  };

  setConfig(param: HermesConfig) {
    this.set("config", param);

    // Set API version.
    this.config["api_version"] = "v1";
    if (this.config.feature_flags["api_v2"]) {
      this.config["api_version"] = "v2";
    }
  }
}

declare module "@ember/service" {
  interface Registry {
    config: ConfigService;
  }
}
