import { action } from "@ember/object";
import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { task } from "ember-concurrency";
import AlgoliaService from "hermes/services/algolia";
import ConfigService from "hermes/services/config";
import { HermesDocument } from "hermes/types/document";
import { SearchResponse } from "instantsearch.js";

// @ts-ignore - not yet typed
import timeAgo from "hermes/utils/time-ago";

interface DashboardLatestUpdatesComponentSignature {
  Args: {};
}

export default class DashboardLatestUpdatesComponent extends Component<DashboardLatestUpdatesComponentSignature> {
  @service("config") declare configSvc: ConfigService;

  @service declare algolia: AlgoliaService;

  @tracked currentTab = "new";
  @tracked docsToShow: HermesDocument[] | null = null;

  /**
   * The message to show when there are no docs for a given tab.
   */
  get emptyStateMessage() {
    switch (this.currentTab) {
      case "new":
        return "No documents have been created yet.";
      case "in-review":
        return "No docs are in review.";
      case "reviewed":
        return "No docs have been reviewed.";
    }
  }
  /**
   * Calls the initial fetchDocs task.
   * Used in the template to show a loader on initial load.
   */
  didInsert = task(async () => {
    await this.fetchDocs.perform();
  });

  /**
   * Set the current tab (if necessary) and fetch its docs.
   */
  @action setCurrentTab(tab: string) {
    if (tab !== this.currentTab) {
      this.currentTab = tab;
      this.fetchDocs.perform();
    }
  }

  /**
   * Sends an Algolia query to fetch the docs for the current tab.
   * Called onLoad and when tabs are changed.
   */
  fetchDocs = task(async () => {
    let facetFilters = "";

    // Translate the current tab to an Algolia facetFilter.
    switch (this.currentTab) {
      case "new":
        facetFilters = "";
        break;
      case "in-review":
        facetFilters = "status:In-Review";
        break;
      case "reviewed":
        facetFilters = "status:reviewed";
        break;
    }

    await this.algolia.clearCache.perform();

    let newDocsToShow = await this.algolia.searchIndex
      .perform(
        this.configSvc.config.algolia_docs_index_name + "_modifiedTime_desc",
        "",
        {
          facetFilters: [facetFilters],
          hitsPerPage: 4,
        }
      )
      .then((result: SearchResponse<unknown>) => {
        // Add modifiedAgo for each doc.
        for (const hit of result.hits as HermesDocument[]) {
          if (hit.modifiedTime) {
            const modifiedAgo = new Date(hit.modifiedTime * 1000);
            hit.modifiedAgo = `Modified ${timeAgo(modifiedAgo)}`;
          }
        }
        return result.hits;
      });

    // Update the docsToShow array with the new docs.
    this.docsToShow = newDocsToShow as HermesDocument[];
  });
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Dashboard::LatestUpdates": typeof DashboardLatestUpdatesComponent;
  }
}
