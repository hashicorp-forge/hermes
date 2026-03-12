import Service from "@ember/service";
import config, { type HermesConfig } from "hermes/config/environment";
import ENV from "hermes/config/environment";

interface MicrosoftConfig {
  clientId: string;
  tenantId: string;
  redirectUri: string;
}

interface RuntimeConfig {
  algolia_docs_index_name: string;
  algolia_drafts_index_name: string;
  algolia_internal_index_name: string;
  algolia_projects_index_name: string;
  api_version?: string;
  create_docs_as_user: boolean;
  feature_flags: Record<string, boolean>;
  google_analytics_tag_id?: string;
  google_doc_folders?: string;
  group_approvals: boolean;
  jira_url: string;
  microsoft?: MicrosoftConfig;
  short_link_base_url: string;
  short_revision: string;
  skip_google_auth: boolean;
  skip_microsoft_auth: boolean;
  support_link_url: string;
  version: string;
}

export default class ConfigService extends Service {
  config: RuntimeConfig = {
    algolia_docs_index_name: config.algolia.docsIndexName,
    algolia_drafts_index_name: config.algolia.draftsIndexName,
    algolia_internal_index_name: config.algolia.internalIndexName,
    algolia_projects_index_name: config.algolia.projectsIndexName,
    api_version: "v1",
    create_docs_as_user: config.createDocsAsUser,
    feature_flags: config.featureFlags,
    google_doc_folders: config.google.docFolders ?? "",
    short_link_base_url: config.shortLinkBaseURL,
    skip_google_auth: config.skipGoogleAuth,
    skip_microsoft_auth: config.skipMicrosoftAuth,
    google_analytics_tag_id: undefined,
    jira_url: config.jiraURL,
    support_link_url: config.supportLinkURL,
    version: config.version,
    short_revision: config.shortRevision,
    group_approvals: config.groupApprovals,
    microsoft: ENV.microsoft,
  };

  setConfig(param: HermesConfig | RuntimeConfig) {
    this.set("config", {
      ...this.config,
      ...param,
      microsoft: param.microsoft ?? this.config.microsoft,
    });

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
