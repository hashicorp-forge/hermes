// @ts-nocheck
// TODO: Type this file.

import Service from "@ember/service";
import config from "hermes/config/environment";

export default class ConfigService extends Service {
  config = {
    algolia_docs_index_name: config.algolia.docsIndexName,
    algolia_drafts_index_name: config.algolia.draftsIndexName,
    algolia_internal_index_name: config.algolia.internalIndexName,
    feature_flags: config.featureFlags,
    google_doc_folders: config.google.docFolders ?? "",
    short_link_base_url: config.shortLinkBaseURL,
    skip_google_auth: config.skipGoogleAuth,
    google_analytics_tag_id: undefined,
    // google_oauth2_client_id:
    //   config.torii.providers["google-oauth2-bearer"].apiKey ?? "",
    // google_oauth2_hd: config.torii.providers["google-oauth2-bearer"].hd ?? "",
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
