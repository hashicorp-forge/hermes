import Service from "@ember/service";
import { inject as service } from "@ember/service";
import { keepLatestTask } from "ember-concurrency";
import FetchService from "./fetch";
import { tracked } from "@glimmer/tracking";
import ConfigService from "hermes/services/config";
import { HermesDocument } from "hermes/types/document";
import SessionService from "hermes/services/session";
import StoreService from "hermes/services/store";
import { HermesProject } from "hermes/types/project";

/**
 * The document format returned by /me/recently-viewed-docs
 */
type IndexedDoc = {
  id: string;
  isDraft: boolean;
  viewedTime: number; // 10-digit Unix timestamp
};

/**
 * The project format returned by /me/recently-viewed-projects
 */
type IndexedProject = {
  id: number;
  viewedTime: number; // 10-digit Unix timestamp
};

/*
 * The mutated document format used by to the front-end
 */
export type RecentlyViewedDoc = IndexedDoc & {
  doc: HermesDocument;
};

/**
 * The mutated project format used by to the front-end
 */
export type RecentlyViewedProject = IndexedProject & {
  project: HermesProject;
};

export default class RecentlyViewedService extends Service {
  @service("config") declare configSvc: ConfigService;
  @service("fetch") declare fetchSvc: FetchService;
  @service declare session: SessionService;
  @service declare store: StoreService;

  /**
   * An unsorted array of RecentlyViewedDocs. Assigned during the `fetchAll` task.
   * Used as the basis for the sorted `index` getter.
   */
  @tracked private _index: Array<
    RecentlyViewedDoc | RecentlyViewedProject
  > | null = null;

  /**
   * The top 10 recently viewed items, sorted by viewedTime.
   */
  get index(): Array<RecentlyViewedDoc | RecentlyViewedProject> | undefined {
    return this._index?.sortBy("viewedTime").reverse().slice(0, 10);
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

      const recentlyViewedProjectsPromise =
        this.fetchSvc
          .fetch(
            `/api/${this.configSvc.config.api_version}/me/recently-viewed-projects`,
          )
          .then((resp) => resp?.json()) || [];

      const [recentlyViewedDocs, recentlyViewedProjects] = await Promise.all([
        recentlyViewedDocsPromise,
        recentlyViewedProjectsPromise,
      ]);

      let formattingPromises: Promise<
        RecentlyViewedDoc | RecentlyViewedProject
      >[] = [];

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
                ...d,
              };
            }),
        );
      });

      recentlyViewedProjects.forEach((p: IndexedProject) => {
        formattingPromises.push(
          this.fetchSvc
            .fetch(`/api/${this.configSvc.config.api_version}/projects/${p.id}`)
            .then((resp) => resp?.json())
            .then((project) => {
              return {
                project,
                ...p,
              };
            }),
        );
      });

      const formattedItems = await Promise.all(formattingPromises);

      /**
       * Load the owner information for each document.
       */
      await this.store.maybeFetchPeople.perform(
        formattedItems.map((d) => {
          if ("doc" in d) {
            return d.doc;
          }
        }),
      );

      /**
       * Update the tracked property to new array of items.
       */
      this._index = formattedItems;
    } catch (e: unknown) {
      this._index = null; // Causes the dashboard to show an error message.
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
