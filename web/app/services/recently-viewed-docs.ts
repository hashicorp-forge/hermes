import Service from "@ember/service";
import { inject as service } from "@ember/service";
import { enqueueTask, restartableTask } from "ember-concurrency";
import FetchService from "./fetch";
import { tracked } from "@glimmer/tracking";
import { HermesDocument } from "hermes/types/document";
import { assert } from "@ember/debug";

// @ts-ignore - not yet typed
import timeAgo from "hermes/utils/time-ago";

const RECENTLY_VIEWED_DOCS_FILENAME = "recently_viewed_docs.json";

type IndexedDoc = {
  id: string;
  isDraft: boolean;
};

export type RecentlyViewedDoc = {
  doc: HermesDocument;
  isDraft: boolean;
};

type RecentlyViewedDocFile = {
  id: string;
  name: string;
};

type RecentlyViewedDocFetchValue = {
  files: RecentlyViewedDocFile[];
};

export default class RecentlyViewedDocsService extends Service {
  @service("fetch") declare fetchSvc: FetchService;
  @service declare session: any;

  /**
   * The ID of the Google Drive file that holds the recently viewed docs.
   */
  @tracked private indexID: string | null = null;

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
       * If the file ID is not known, call the task that fetches it.
       * This occurs when initially loading from the `dashboard` route,
       * and for users who have not yet viewed a file.
       */
      if (!this.indexID) {
        await this.fetchIndexID.perform();
      }

      assert("_get expects a indexID", this.indexID);

      /**
       * Fetch the file IDs from the Google Index file.
       */
      let fetchResponse = await this.fetchSvc.fetch(
        "/api/v1/me/recently-viewed-docs"
      );

      this.index = await fetchResponse?.json();

      assert("fetchAll expects index", this.index);

      /**
       * Ensure that the index is no more than 4 items.
       * Applies to legacy users viewing the dashboard for the
       * first time since drafts were added to the index.
       */
      this.index = this.index.slice(0, 4);

      /**
       * The legacy index was an array of strings, not objects.
       * If this.index contains strings, we convert them to objects.
       */
      let newIndex: IndexedDoc[] = [];

      this.index.forEach((objectOrIDString) => {
        if (typeof objectOrIDString === "string")
          objectOrIDString = {
            id: objectOrIDString,
            isDraft: false,
          };
        newIndex.push(objectOrIDString);
      });

      this.index = newIndex;

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

  /**
   * Creates a new Google Drive file to hold the recently viewed docs.
   * Called by `fetchIndexID` if the file does not exist.
   */
  private createIndexFile = restartableTask(async () => {
    try {
      let body =
        "--PART_BOUNDARY\nContent-Type: application/json; charset=UTF-8\n\n" +
        JSON.stringify({
          name: RECENTLY_VIEWED_DOCS_FILENAME,
          parents: ["appDataFolder"],
        }) +
        "\n--PART_BOUNDARY\nContent-Type: application/json\n\n" +
        JSON.stringify(this.index) +
        "\n--PART_BOUNDARY--";
      await this.fetchSvc.fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
        {
          method: "POST",
          headers: {
            Authorization:
              "Bearer " + this.session.data.authenticated.access_token,
            "Content-Type": "multipart/related; boundary=PART_BOUNDARY",
          },
          body: body,
        }
      );
    } catch (e: unknown) {
      console.error("Error creating index file", e);
      throw e;
    }
  });

  /***
   * Sets `recentDocsFileID` to the ID of the file on Google Drive.
   * Used by the `get` and `markViewed` tasks if the file ID is not already known,
   * e.g., when first viewing the dashboard, or loading from `/document`
   */
  private fetchIndexID = restartableTask(async () => {
    try {
      let fetchResponse = await this.fetchSvc.fetch(
        "https://www.googleapis.com/drive/v3/files?" +
          new URLSearchParams({
            fields: "files(id, name)",
            spaces: "appDataFolder",
          }),
        {
          headers: {
            Authorization:
              "Bearer " + this.session.data.authenticated.access_token,
            "Content-Type": "application/json",
          },
        }
      );

      /**
       * If the file does not exist, create it and rerun this task.
       */
      if (fetchResponse?.status !== 200) {
        await this.createIndexFile.perform();
        await this.fetchIndexID.perform();
        return;
      }

      let fetchValue =
        (await fetchResponse.json()) as RecentlyViewedDocFetchValue;

      assert("setDataBaseFileID expects a fetchValue", fetchValue);

      let file = fetchValue.files.find(
        (o: RecentlyViewedDocFile) => o.name === RECENTLY_VIEWED_DOCS_FILENAME
      );

      assert("setDataBaseFileID expects a file", file);
      this.indexID = file.id;
    } catch (e: unknown) {
      console.error("Error fetching indexID", e);
      throw e;
    }
  });

  /**
   * Adds a doc to the body of the recently viewed docs file.
   * Called by the `document` route on load. To avoid conflicts in cases
   * where a user views many docs quickly, we enqueue up to 3 tasks.
   */
  markViewed = enqueueTask(
    { maxConcurrency: 3 },
    async (docOrDraftID: string, isDraft = false) => {
      try {
        /**
         * If the indexID is not known, call the task that fetches it.
         * This occurs when the user loads from the `document` route.
         */
        if (!this.indexID) {
          await this.fetchIndexID.perform();
          await this.fetchAll.perform();
        }

        assert("markViewed expects an index", this.index);

        /**
         * Filter out the file if it exists on the index.
         */
        let newIndex = this.index.filter((e) => {
          if (typeof e === "string") {
            return e !== docOrDraftID;
          } else {
            return e.id !== docOrDraftID;
          }
        });

        /**
         * Add the doc to the beginning of the array regardless of
         * whether it was filtered out above.
         */
        newIndex.unshift({ id: docOrDraftID, isDraft: isDraft });

        /**
         * Update the tracked property.
         */
        this.index = newIndex.slice(0, 4);
        /**
         * Patch the file on Google Drive with the new index.
         */
        await this.fetchSvc.fetch(
          `https://www.googleapis.com/upload/drive/v3/files/${this.indexID}`,
          {
            method: "PATCH",
            headers: {
              Authorization:
                "Bearer " + this.session.data.authenticated.access_token,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(this.index),
          }
        );

        /**
         * Fetch the docs to update the tracked `all` property.
         * Done so the list of recently viewed docs is updated
         * by the time the user returns to the dashboard.
         */
        void this.fetchAll.perform();
      } catch (e: unknown) {
        console.error("error marking viewed", e);
        throw e;
      }
    }
  );
}

declare module "@ember/service" {
  interface Registry {
    "recently-viewed-docs": RecentlyViewedDocsService;
  }
}
