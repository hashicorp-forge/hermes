import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import AlgoliaService, {
  AlgoliaFacetsObject,
  AlgoliaSearchParams,
  FACET_NAMES,
  HITS_PER_PAGE,
  MAX_VALUES_PER_FACET,
} from "hermes/services/algolia";
import { DocumentsRouteParams } from "hermes/types/document-routes";
import { FacetRecords } from "hermes/types/facets";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import { task } from "ember-concurrency";
import FetchService from "hermes/services/fetch";
import { assert } from "@ember/debug";
import ActiveFiltersService from "hermes/services/active-filters";

interface DraftResponseJSON {
  facets: AlgoliaFacetsObject;
  Hits: Array<unknown>; // Documents, not yet typed
  params: string;
  page: number;
}

export default class DraftsRoute extends Route {
  @service("fetch") declare fetchSvc: FetchService;
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
  /**
   * Gets facets for the drafts page. Scoped to the current user.
   * FIXME: These facets compound as "OR" rather than "AND".
   * FIXME: Facet counts should update when a facet is selected
   */
  private getDraftFacets = task(
    async (params: AlgoliaSearchParams): Promise<FacetRecords | undefined> => {
      try {
        let algoliaFacets = await this.getDraftResults.perform(params, true);
        assert("getDraftFacets expects algoliaFacets to exist", algoliaFacets);

        /**
         * Map the facets to a new object with additional nested properties
         */
        let facets: FacetRecords = this.algolia.mapStatefulFacetKeys(
          algoliaFacets.facets
        );

        Object.entries(facets).forEach(([name, facet]) => {
          /**
           * e.g., name === "product"
           * e.g., facet === { "Vault": { count: 1, selected: false }}
           */
          this.algolia.markSelected(facet, params[name]);
        });
        return facets;
      } catch (e) {
        console.error(e);
      }
    }
  );

  async model(params: DocumentsRouteParams) {
    let [facets, results] = await Promise.all([
      this.getDraftFacets.perform(params),
      this.getDraftResults.perform(params),
    ]);

    this.activeFilters.update(params);

    return { facets, results };
  }
}
