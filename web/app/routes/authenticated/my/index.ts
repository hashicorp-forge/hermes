import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import AlgoliaService, { AlgoliaSearchParams } from "hermes/services/algolia";
import ConfigService from "hermes/services/config";
import FetchService from "hermes/services/fetch";
import { DraftResponseJSON } from "../my";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import { task } from "ember-concurrency";
import { SearchResponse } from "instantsearch.js";
import { HermesDocument } from "hermes/types/document";
import { assert } from "@ember/debug";

export default class AuthenticatedMyIndexRoute extends Route {
  @service("fetch") declare fetchSvc: FetchService;
  @service("config") declare configSvc: ConfigService;
  @service declare algolia: AlgoliaService;
  @service declare authenticatedUser: AuthenticatedUserService;

  /**
   * TODO: move to shared location
   * Generates a URLSearchParams object for the drafts endpoint.
   */
  private createDraftURLSearchParams(): URLSearchParams {
    return new URLSearchParams(
      Object.entries({
        hitsPerPage: 1000,
        maxValuesPerFacet: 1,
        page: 0,
        ownerEmail: this.authenticatedUser.info.email,
      })
        .map(([key, val]) => `${key}=${val}`)
        .join("&"),
    );
  }

  /**
   * Fetches draft doc information based on searchParams and the current user.
   */
  private getDraftResults = task(
    async (
      params: AlgoliaSearchParams,
    ): Promise<DraftResponseJSON | undefined> => {
      try {
        let response = await this.fetchSvc
          .fetch(
            `/api/${this.configSvc.config.api_version}/drafts?` +
              this.createDraftURLSearchParams(),
          )
          .then((response) => response?.json());
        return response;
      } catch (e: unknown) {
        console.error(e);
      }
    },
  );

  async model() {
    const searchIndex =
      this.configSvc.config.algolia_docs_index_name + "_createdTime_desc";
    let [draftResults, docResults] = await Promise.all([
      this.getDraftResults.perform({}),
      this.algolia.getDocResults.perform(searchIndex, {}, true),
    ]);

    const latest = [
      ...(draftResults?.Hits ?? []),
      ...((docResults as SearchResponse<HermesDocument>).hits ?? []),
    ].sort((a, b) => {
      if (a.modifiedTime && b.modifiedTime) {
        return b.modifiedTime - a.modifiedTime;
      } else {
        // if one has modifiedTime and the other doesn't,
        // the one with the modifiedTime is newer
        return a.modifiedTime ? -1 : 1;
      }
    });

    return latest;
  }
}
