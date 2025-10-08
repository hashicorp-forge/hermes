import Service from "@ember/service";
import { service } from "@ember/service";
import { keepLatestTask } from "ember-concurrency";
import { tracked } from "@glimmer/tracking";
import ConfigService from "hermes/services/config";
import { HermesDocument } from "hermes/types/document";
import { assert } from "@ember/debug";
import SearchService from "./search";
import StoreService from "hermes/services/store";

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
    const response = await this.search.searchIndex
      .perform(
        this.configSvc.config.algolia_docs_index_name + "_createdTime_desc",
        "",
        {
          hitsPerPage: 12,
        },
      )
      .then((response) => response);

    assert("response must exist", response);

    this.index = response.hits.map((hit) => {
      return {
        ...(hit as HermesDocument),
        // We use summary instead of snippet on the dashboard
        _snippetResult: undefined,
      };
    }) as HermesDocument[];

    // Load the owner information
    await this.store.maybeFetchPeople.perform(this.index);

    this.nbPages = response.nbPages;
  });
}

declare module "@ember/service" {
  interface Registry {
    "latest-docs": LatestDocsService;
  }
}
