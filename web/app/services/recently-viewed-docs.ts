import Service from "@ember/service";
import { inject as service } from "@ember/service";
import { keepLatestTask } from "ember-concurrency";
import FetchService from "./fetch";
import { tracked } from "@glimmer/tracking";
import ConfigService from "hermes/services/config";
import { HermesDocument } from "hermes/types/document";
import SessionService from "hermes/services/session";
import StoreService from "hermes/services/store";

type IndexedDoc = {
  id: string;
  isDraft: boolean;
  viewedTime: number;
};

export type RecentlyViewedDoc = {
  doc: HermesDocument;
  isDraft: boolean;
  viewedTime: number;
};

export default class RecentlyViewedDocsService extends Service {
  @service("config") declare configSvc: ConfigService;
  @service("fetch") declare fetchSvc: FetchService;
  @service declare session: SessionService;
  @service declare store: StoreService;

  /**
   * The index of the recently viewed docs.
   * May include strings (IDs) to support legacy users who
   * have not viewed a file since drafts were added to the index.
   */
  @tracked private index: (IndexedDoc | string)[] | null = null;

  /**
   * All RecentlyViewedDocs. Each object contains a HermesDocument
   * and a boolean indicating whether it is a draft.
   * Rendered by the dashboard template.
   */
  @tracked all: RecentlyViewedDoc[] | null = null;

  /**
   * Fetches an array of recently viewed docs.
   * Called in the dashboard route if the docs are not already loaded.
   */
  fetchAll = keepLatestTask(async () => {
    try {
      /**
       * Fetch the file IDs from the backend.
       */
      this.index =
        (await this.fetchSvc
          .fetch(
            `/api/${this.configSvc.config.api_version}/me/recently-viewed-docs`,
          )
          .then((resp) => resp?.json())) || [];

      /**
       * Get the documents from the backend.
       */
      let docResponses = await Promise.allSettled(
        (this.index as IndexedDoc[]).map(async (d: IndexedDoc) => {
          let endpoint = d.isDraft ? "drafts" : "documents";
          let doc = await this.fetchSvc
            .fetch(
              `/api/${this.configSvc.config.api_version}/${endpoint}/${d.id}`,
            )
            .then((resp) => resp?.json());

          doc.isDraft = d.isDraft;

          return {
            doc,
            isDraft: d.isDraft,
            viewedTime: d.viewedTime,
          };
        }),
      );

      /**
       * Set up an empty array to hold the documents.
       */
      let newAll: RecentlyViewedDoc[] = [];

      /**
       * For each fulfilled response, push the document to the array
       */
      docResponses.forEach((response) => {
        if (response.status == "fulfilled") {
          newAll.push(response.value);
        }
      });

      /**
       * Load the owner information for each document.
       */
      await this.store.maybeFetchPeople.perform(newAll.map((d) => d.doc));

      /**
       * Update the tracked property to new array of documents.
       */
      this.all = newAll;
    } catch (e: unknown) {
      this.all = null; // Causes the dashboard to show an error message.
      console.error("Error fetching recently viewed docs", e);
      throw e;
    }
  });
}

declare module "@ember/service" {
  interface Registry {
    "recently-viewed-docs": RecentlyViewedDocsService;
  }
}
