import Service from "@ember/service";
import { inject as service } from "@ember/service";
import { enqueueTask, restartableTask } from "ember-concurrency";
import FetchService from "./fetch";
import { tracked } from "@glimmer/tracking";
import { HermesDocument } from "hermes/types/document";
import { assert } from "@ember/debug";

// @ts-ignore - not yet typed
import timeAgo from "hermes/utils/time-ago";

type IndexedDoc = {
  id: string;
  isDraft: boolean;
};

export type RecentlyViewedDoc = {
  doc: HermesDocument;
  isDraft: boolean;
};

export default class RecentlyViewedDocsService extends Service {
  @service("fetch") declare fetchSvc: FetchService;
  @service declare session: any;

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
  fetchAll = restartableTask(async () => {
    try {
      /**
       * Fetch the file IDs from the backend.
       */
      let fetchResponse = await this.fetchSvc.fetch(
        "/api/v1/me/recently-viewed-docs"
      );

      this.index = (await fetchResponse?.json()) || [];

      assert("fetchAll expects index", this.index);

      /**
       * Ensure that the index is no more than 4 items.
       * Applies to legacy users viewing the dashboard for the
       * first time since drafts were added to the index.
       */
      this.index = this.index.slice(0, 4);

      /**
       * Get the documents from the backend.
       */
      let docResponses = await Promise.allSettled(
        (this.index as IndexedDoc[]).map(async ({ id, isDraft }) => {
          let endpoint = isDraft ? "drafts" : "documents";
          let fetchResponse = await this.fetchSvc.fetch(
            `/api/v1/${endpoint}/${id}`
          );
          return {
            doc: await fetchResponse?.json(),
            isDraft,
          };
        })
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
          let recentlyViewed = response.value as RecentlyViewedDoc;
          recentlyViewed.doc.modifiedAgo = `Modified ${timeAgo(
            new Date(recentlyViewed.doc.modifiedTime * 1000)
          )}`;
          newAll.push(response.value);
        }
      });

      /**
       * Update the tracked property to new array of documents.
       */
      this.all = newAll;
    } catch (e: unknown) {
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
