import Service from "@ember/service";
import { service } from "@ember/service";
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
 * The mutated document format used by the front-end
 */
export type RecentlyViewedDoc = IndexedDoc & {
  doc: HermesDocument;
};

/**
 * The mutated project format used by the front-end
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
   * An unsorted array of recently viewed docs and projects.
   * Set by the `fetchAll` task which is awaited on the dashboard route
   * and called in the background when viewing docs and projects.
   * Used as the basis for the sorted `index` getter.
   */
  @tracked private _index: Array<
    RecentlyViewedDoc | RecentlyViewedProject
  > | null = null;

  /**
   * A potentially combined array of the ten most recently viewed docs and projects.
   */
  get index(): Array<RecentlyViewedDoc | RecentlyViewedProject> | undefined {
    return this._index
      ?.sort((a, b) => (b.viewedTime || 0) - (a.viewedTime || 0))
      .slice(0, 10);
  }

  /**
   * Fetches an array of recently viewed docs and projects.
   * Called in the dashboard route if the docs are not already loaded
   * and called in the background when viewing docs and projects.
   */
  fetchAll = keepLatestTask(async () => {
    try {
      // Set a promise to fetch the recently viewed docs
      const recentlyViewedDocsPromise = this.fetchSvc
        .fetch(
          `/api/${this.configSvc.config.api_version}/me/recently-viewed-docs`,
        )
        .then((resp) => resp?.json());
      // Set a promise to fetch the recently viewed projects
      const recentlyViewedProjectsPromise = this.fetchSvc
        .fetch(
          `/api/${this.configSvc.config.api_version}/me/recently-viewed-projects`,
        )
        .then((resp) => resp?.json());

      // Await both promises
      const [recentlyViewedDocs, recentlyViewedProjects] = await Promise.all([
        recentlyViewedDocsPromise,
        recentlyViewedProjectsPromise,
      ]);

      // Create a placeholder array for the full item promises
      let fullItemPromises: Promise<
        RecentlyViewedDoc | RecentlyViewedProject | null
      >[] = [];

      // Promise to get each doc and return it in the RecentlyViewedDoc format
      recentlyViewedDocs?.forEach((d: IndexedDoc) => {
        const endpoint = d.isDraft ? "drafts" : "documents";

        fullItemPromises.push(
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
            })
            /**
             * A failed fetch here is likely a deleted or newly private draft.
             * We return null to filter it out of the array and keep the
             * widget from breaking.
             */
            .catch(() => null),
        );
      });

      // Promise to get each project and return it in the RecentlyViewedProject format
      recentlyViewedProjects?.forEach((p: IndexedProject) => {
        fullItemPromises.push(
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

      // Await the full item promises
      const formattedItems = await Promise.all(fullItemPromises);

      // Load doc owners into the store
      await this.store.maybeFetchPeople.perform(
        formattedItems.map((d) => {
          if (!d) return;
          if ("doc" in d) {
            return d.doc;
          }
        }),
      );

      // Update the local array to recompute the getter
      this._index = formattedItems.filter((item): item is RecentlyViewedDoc | RecentlyViewedProject => item != null);
    } catch (e) {
      // Log an error if the fetch fails
      console.error("Error fetching recently viewed docs", e);

      // Cause the dashboard to show an error message.
      this._index = null;
    }
  });
}

declare module "@ember/service" {
  interface Registry {
    "recently-viewed": RecentlyViewedService;
  }
}
