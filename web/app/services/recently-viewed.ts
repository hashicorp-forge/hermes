import Service from "@ember/service";
import { inject as service } from "@ember/service";
import { keepLatestTask } from "ember-concurrency";
import FetchService from "./fetch";
import { tracked } from "@glimmer/tracking";
import ConfigService from "hermes/services/config";
import { HermesDocument } from "hermes/types/document";
import SessionService from "hermes/services/session";
import StoreService from "hermes/services/store";

/**
 * The document format returned by /me/recently-viewed-docs
 */
type IndexedDoc = {
  id: string;
  isDraft: boolean;
  viewedTime: number; // 10-digit Unix timestamp
};

/**
 * The mutated document format used by to the front-end
 */
export type RecentlyViewedDoc = {
  doc: HermesDocument;
  isDraft: boolean;
  viewedTime: number;
};

export default class RecentlyViewedService extends Service {
  @service("config") declare configSvc: ConfigService;
  @service("fetch") declare fetchSvc: FetchService;
  @service declare session: SessionService;
  @service declare store: StoreService;

  /**
   * All recently viewed docs. Each object contains a HermesDocument
   * and a boolean indicating whether it is a draft.
   * Rendered by the dashboard template.
   */
  @tracked all: RecentlyViewedDoc[] | null = null;

  /**
   * The top 10 recently viewed docs.
   */
  get index(): RecentlyViewedDoc[] | undefined {
    return this.all?.sortBy("viewedTime").reverse().slice(0, 10);
  }

  /**
   * Fetches an array of recently viewed docs.
   * Called in the dashboard route if the docs are not already loaded.
   */
  fetchAll = keepLatestTask(async () => {
    try {
      /**
       * Fetch the file IDs from the backend.
       */
      const recentlyViewedDocsPromise =
        this.fetchSvc
          .fetch(
            `/api/${this.configSvc.config.api_version}/me/recently-viewed-docs`,
          )
          .then((resp) => resp?.json()) || [];

      const [recentlyViewedDocs] = await Promise.all([
        recentlyViewedDocsPromise,
      ]);

      let formattingPromises: Promise<RecentlyViewedDoc>[] = [];

      recentlyViewedDocs.forEach((d: IndexedDoc) => {
        const endpoint = d.isDraft ? "drafts" : "documents";

        formattingPromises.push(
          this.fetchSvc
            .fetch(
              `/api/${this.configSvc.config.api_version}/${endpoint}/${d.id}`,
            )
            .then((resp) => resp?.json())
            .then((doc) => {
              return {
                doc,
                isDraft: d.isDraft,
                viewedTime: d.viewedTime,
              };
            }),
        );
      });

      const formattedDocs = await Promise.all(formattingPromises);
      console.log("fullDocs", formattedDocs);

      /**
       * Load the owner information for each document.
       */
      await this.store.maybeFetchPeople.perform(
        formattedDocs.map((d) => d.doc),
      );

      /**
       * Update the tracked property to new array of documents.
       */
      this.all = formattedDocs;
    } catch (e: unknown) {
      this.all = null; // Causes the dashboard to show an error message.
      console.error("Error fetching recently viewed docs", e);
      throw e;
    }
  });
}

declare module "@ember/service" {
  interface Registry {
    "recently-viewed": RecentlyViewedService;
  }
}
