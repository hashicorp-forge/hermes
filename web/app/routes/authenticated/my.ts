import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import ConfigService from "hermes/services/config";
import { DocumentsRouteParams } from "hermes/types/document-routes";
import ActiveFiltersService from "hermes/services/active-filters";
import { SortByValue } from "hermes/components/header/toolbar";

import AlgoliaService, {
  AlgoliaFacetsObject,
  AlgoliaSearchParams,
} from "hermes/services/algolia";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import { task } from "ember-concurrency";
import FetchService from "hermes/services/fetch";
import { assert } from "@ember/debug";
import { HermesDocument } from "hermes/types/document";
import { SearchResponse } from "instantsearch.js";
import { dasherize } from "@ember/string";

export interface DraftResponseJSON {
  facets: AlgoliaFacetsObject;
  Hits: HermesDocument[];
  params: string;
  page: number;
  nbPages: number;
}

export default class AuthenticatedMyRoute extends Route {
  @service("fetch") declare fetchSvc: FetchService;
  @service("config") declare configSvc: ConfigService;
  @service declare algolia: AlgoliaService;
  @service declare activeFilters: ActiveFiltersService;
  @service declare authenticatedUser: AuthenticatedUserService;

  /**
   * Generates a URLSearchParams object for the drafts endpoint.
   */
  private createDraftURLSearchParams(): URLSearchParams {
    return new URLSearchParams(
      Object.entries({
        hitsPerPage: 12,
        maxValuesPerFacet: 1,
        page: 0,
        ownerEmail: this.authenticatedUser.info.email,
      })
        .map(([key, val]) => `${key}=${val}`)
        .join("&")
    );
  }

  /**
   * Fetches draft doc information based on searchParams and the current user.
   */
  private getDraftResults = task(
    async (
      params: AlgoliaSearchParams
    ): Promise<DraftResponseJSON | undefined> => {
      try {
        let response = await this.fetchSvc
          .fetch("/api/v1/drafts?" + this.createDraftURLSearchParams())
          .then((response) => response?.json());
        return response;
      } catch (e: unknown) {
        console.error(e);
      }
    }
  );

  async model(params: DocumentsRouteParams): Promise<{
    latest: HermesDocument[];
    published: HermesDocument[];
    draftResults?: DraftResponseJSON;
  }> {
    // const sortedBy = (params.sortBy as SortByValue) ?? SortByValue.DateDesc;
    const searchIndex =
      params.sortBy === SortByValue.DateAsc
        ? this.configSvc.config.algolia_docs_index_name + "_createdTime_asc"
        : this.configSvc.config.algolia_docs_index_name + "_createdTime_desc";

    let [draftResults, docResults] = await Promise.all([
      this.getDraftResults.perform(params),
      this.algolia.getDocResults.perform(searchIndex, { ...params }, true),
    ]);

    docResults = docResults as SearchResponse<HermesDocument>;

    this.activeFilters.update(params);

    // @ts-ignore - TODO: fix
    const docs = docResults?.hits ?? [];

    const latest = [
      ...(draftResults?.Hits ?? []),
      ...((docResults as SearchResponse<HermesDocument>).hits ?? []),
    ]
      .sort((a, b) => {
        assert("createdTime must be defined", a.createdTime && b.createdTime);
        return b.createdTime - a.createdTime;
      })
      .splice(0, 12);

    const published = docs.filter((doc: HermesDocument) => {
      const dasherizedName = dasherize(doc.status);
      return (
        dasherizedName === "in-review" ||
        dasherizedName === "approved" ||
        dasherizedName === "obsolete"
      );
    });

    return { latest, published, draftResults };
  }
}
