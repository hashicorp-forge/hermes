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

export type RecentlyViewedDoc = {
  doc: HermesDocument;
  isDraft: boolean;
  viewedTime: number; // 10-digit Unix timestamp
};

export type RecentlyViewedProject = {
  project: HermesProject;
  viewedTime: number; // 10-digit Unix timestamp
};

export default class RecentlyViewedService extends Service {
  @service("config") declare configSvc: ConfigService;
  @service("fetch") declare fetchSvc: FetchService;
  @service declare session: SessionService;
  @service declare store: StoreService;

  /**
   * All RecentlyViewedDocs. Each object contains a HermesDocument
   * and a boolean indicating whether it is a draft.
   * Rendered by the dashboard template.
   */
  @tracked all: Array<RecentlyViewedDoc | RecentlyViewedProject> | null = null;

  get index() {
    const now = new Date().getTime() / 1000;
    const ninetyDaysAgo = now - 90 * 24 * 60 * 60;
    const sortedArray = this.all?.sortBy("viewedTime").reverse();

    return sortedArray
      ?.filter((object) => {
        return object.viewedTime > ninetyDaysAgo;
      })
      .slice(0, 10);
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
      const recentlyViewedDocs =
        (await this.fetchSvc
          .fetch(
            `/api/${this.configSvc.config.api_version}/me/recently-viewed-docs`,
          )
          .then((resp) => resp?.json())) || [];

      const recentlyViewedProjects =
        (await this.fetchSvc
          .fetch(
            `/api/${this.configSvc.config.api_version}/me/recently-viewed-projects`,
          )
          .then((resp) => resp?.json())) || [];

      /**
       * Get the documents from the backend.
       */
      let docResponses = await Promise.allSettled(
        recentlyViewedDocs.map(async (d: IndexedDoc) => {
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
       * Get the projects from the backend.
       */
      let projectResponses = await Promise.allSettled(
        recentlyViewedProjects.map(async (p: IndexedProject) => {
          const project = await this.fetchSvc
            .fetch(`/api/${this.configSvc.config.api_version}/projects/${p.id}`)
            .then((resp) => resp?.json());

          return {
            project,
            viewedTime: p.viewedTime,
          };
        }),
      );

      /**
       * Set up an empty array to hold the objects.
       */
      let newAll: Array<RecentlyViewedDoc | RecentlyViewedProject> = [];

      /**
       * For each fulfilled response, push the document to the array
       */
      docResponses.forEach((response) => {
        if (response.status == "fulfilled") {
          newAll.push(response.value);
        }
      });

      /**
       * For each fulfilled response, push the project to the array
       */
      projectResponses.forEach((response) => {
        if (response.status == "fulfilled") {
          newAll.push(response.value);
        }
      });

      /**
       * Load the owner information for each document.
       */
      await this.store.maybeFetchPeople.perform(
        newAll.map((d) => {
          if ("doc" in d) return d.doc;
        }),
      );

      console.log("newAll", newAll);

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
    "recently-viewed": RecentlyViewedService;
  }
}
