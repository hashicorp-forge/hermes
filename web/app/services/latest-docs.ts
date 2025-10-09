import Service from "@ember/service";
import { service } from "@ember/service";
import { keepLatestTask } from "ember-concurrency";
import { tracked } from "@glimmer/tracking";
import ConfigService from "hermes/services/config";
import { HermesDocument } from "hermes/types/document";
import { assert } from "@ember/debug";
import SearchService from "./search";
import StoreService from "hermes/services/store";
import { withTimeout } from "hermes/utils/promise-timeout";

export default class LatestDocsService extends Service {
  @service("config") declare configSvc: ConfigService;
  @service declare search: SearchService;
  @service declare store: StoreService;

  /**
   * The index of the most recent documents.
   * Used by the dashboard feed.
   */
  @tracked index: HermesDocument[] | null = null;

  /**
   * The number of pages of results. If this is more than 1,
   * a "See all" link will be shown on the dashboard.
   */
  @tracked nbPages = 0;

  /**
   * The call to fetch the latest documents.
   * Awaited by the dashboard on first load then updated
   * in the background on subsequent visits.
   */
  fetchAll = keepLatestTask(async () => {
    console.log('[LatestDocs] 🔄 Starting fetchAll task...');
    console.log('[LatestDocs] 🔍 Searching index:', this.configSvc.config.algolia_docs_index_name + "_createdTime_desc");
    
    try {
      const response = await withTimeout(
        this.search.searchIndex
          .perform(
            this.configSvc.config.algolia_docs_index_name + "_createdTime_desc",
            "",
            {
              hitsPerPage: 12,
            },
          )
          .then((response) => {
            console.log('[LatestDocs] 📬 Search response received, hits:', response?.hits?.length);
            return response;
          }),
        30000, // 30 second timeout for search
        'Latest docs search'
      );

      assert("response must exist", response);

      console.log('[LatestDocs] 🗺️ Mapping', response.hits.length, 'hits to documents');
      this.index = response.hits.map((hit) => {
        return {
          ...(hit as HermesDocument),
          // We use summary instead of snippet on the dashboard
          _snippetResult: undefined,
        };
      }) as HermesDocument[];

      // Load the owner information with timeout
      console.log('[LatestDocs] 👥 Loading owner information for', this.index.length, 'documents');
      await withTimeout(
        this.store.maybeFetchPeople.perform(this.index),
        30000, // 30 second timeout for fetching people
        'Fetching people for latest docs'
      );

      this.nbPages = response.nbPages;
      console.log('[LatestDocs] ✅ FetchAll complete, nbPages:', this.nbPages);
    } catch (error) {
      console.error('[LatestDocs] ❌ Error in fetchAll:', error);
      // Set empty state on error so UI doesn't hang
      this.index = [];
      this.nbPages = 0;
      throw error; // Re-throw so caller knows it failed
    }
  });
}

declare module "@ember/service" {
  interface Registry {
    "latest-docs": LatestDocsService;
  }
}
