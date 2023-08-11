// @ts-nocheck
// TODO: Type this file.

import Service from "@ember/service";
import config from "hermes/config/environment";

export default class ConfigService extends Service {
  config = {
    algolia_docs_index_name: config.algolia.docsIndexName,
    algolia_drafts_index_name: config.algolia.draftsIndexName,
    algolia_template_index_name: config.algolia.templateIndexName,
    algolia_internal_index_name: config.algolia.internalIndexName,
    feature_flags: config.featureFlags,
    google_doc_folders: config.google.docFolders ?? "",
    short_link_base_url: config.shortLinkBaseURL,
    skip_google_auth: config.skipGoogleAuth,
    google_analytics_tag_id: undefined,
  };

  setConfig(param) {
    this.set("config", param);
  }
}

declare module "@ember/service" {
  interface Registry {
    config: ConfigService;
  }
}
