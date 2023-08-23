import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import ConfigService from "hermes/services/config";
import { DocumentsRouteParams } from "hermes/types/document-routes";
import ActiveFiltersService from "hermes/services/active-filters";

import AlgoliaService, {
  AlgoliaFacetsObject,
  AlgoliaSearchParams,
  FACET_NAMES,
  HITS_PER_PAGE,
  MAX_VALUES_PER_FACET,
} from "hermes/services/algolia";
import { FacetRecords } from "hermes/types/facets";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import { task } from "ember-concurrency";
import FetchService from "hermes/services/fetch";
import { assert } from "@ember/debug";
import { HermesDocument } from "hermes/types/document";
import { SearchResponse } from "instantsearch.js";

interface DraftResponseJSON {
  facets: AlgoliaFacetsObject;
  Hits: HermesDocument[];
  params: string;
  page: number;
}

export default class AuthenticatedMyRoute extends Route {
  @service("fetch") declare fetchSvc: FetchService;
  @service("config") declare configSvc: ConfigService;
  @service declare algolia: AlgoliaService;
  @service declare activeFilters: ActiveFiltersService;
  @service declare authenticatedUser: AuthenticatedUserService;

  queryParams = {
    docType: {
      refreshModel: true,
    },
    owners: {
      refreshModel: true,
    },
    page: {
      refreshModel: true,
    },
    product: {
      refreshModel: true,
    },
    sortBy: {
      refreshModel: true,
    },
    status: {
      refreshModel: true,
    },
  };

  /**
   * Generates a URLSearchParams object for the drafts endpoint.
   */
  private createDraftURLSearchParams(
    params: AlgoliaSearchParams,
    ownerFacetOnly: boolean
  ): URLSearchParams {
    /**
     * In the case of facets, we want to filter by just the owner facet.
     * In the case of documents, we want to filter by all facets.
     */
    let facetFilters = ownerFacetOnly
      ? [`owners:${this.authenticatedUser.info.email}`]
      : this.algolia.buildFacetFilters(params);

    return new URLSearchParams(
      Object.entries({
        facets: FACET_NAMES,
        hitsPerPage: HITS_PER_PAGE,
        maxValuesPerFacet: MAX_VALUES_PER_FACET,
        facetFilters: facetFilters,
        page: params.page ? params.page - 1 : 0,
        sortBy: params["sortBy"],
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
      params: AlgoliaSearchParams,
      ownerFacetOnly = false
    ): Promise<DraftResponseJSON | undefined> => {
      try {
        let response = await this.fetchSvc
          .fetch(
            "/api/v1/drafts?" +
              this.createDraftURLSearchParams(params, ownerFacetOnly)
          )
          .then((response) => response?.json());
        return response;
      } catch (e: unknown) {
        console.error(e);
      }
    }
  );

  async model(params: DocumentsRouteParams): Promise<{
    draftsAndDocs: HermesDocument[];
    drafts: HermesDocument[];
    docs: HermesDocument[];
  }> {
    const searchIndex =
      params.sortBy === "dateAsc"
        ? this.configSvc.config.algolia_docs_index_name + "_createdTime_asc"
        : this.configSvc.config.algolia_docs_index_name + "_createdTime_desc";

    let [draftResults, docResults] = await Promise.all([
      this.getDraftResults.perform(params),
      this.algolia.getDocResults.perform(
        searchIndex,
        { ...params, hitsPerPage: 1000 },
        true
      ),
    ]);

    docResults = docResults as SearchResponse<HermesDocument>;

    this.activeFilters.update(params);

    // @ts-ignore - TODO: fix
    const docs = docResults?.hits ?? [];
    const drafts = draftResults?.Hits ?? [];

    let draftsAndDocs = [
      ...(draftResults?.Hits ?? []),
      ...((docResults as SearchResponse<HermesDocument>).hits ?? []),
    ].sort((a, b) => {
      assert("createdTime must be defined", a.createdTime && b.createdTime);
      return b.createdTime - a.createdTime;
    });

    return { draftsAndDocs, drafts, docs };
  }
}
