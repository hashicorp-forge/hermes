import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import AlgoliaService from "hermes/services/algolia";
import ConfigService from "hermes/services/config";
import { ResultsRouteParams } from "hermes/types/document-routes";
import ActiveFiltersService from "hermes/services/active-filters";
import StoreService from "hermes/services/store";
import { HermesDocument } from "hermes/types/document";
import { SearchResponse } from "instantsearch.js";

export default class AuthenticatedResultsRoute extends Route {
  @service("config") declare configSvc: ConfigService;
  @service declare algolia: AlgoliaService;
  @service declare activeFilters: ActiveFiltersService;
  @service declare store: StoreService;

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
    status: {
      refreshModel: true,
    },
    q: {
      refreshModel: true,
    },
  };

  async model(params: ResultsRouteParams) {
    const docsIndex = this.configSvc.config.algolia_docs_index_name;

    const [docFacets, docResults] = await Promise.all([
      this.algolia.getFacets.perform(docsIndex, params),
      this.algolia.getDocResults.perform(docsIndex, params),
    ]);

    const typedDocResults = docResults as SearchResponse<HermesDocument>;

    const hits = typedDocResults.hits;

    if (hits) {
      // Load owner information
      await this.store.maybeFetchPeople.perform(hits);
    }

    this.activeFilters.update(params);

    return { docFacets, docResults: typedDocResults };
  }

  /**
   * The actions to run when the route is deactivated.
   * Resets the active filters for the next time the route is activated.
   */
  deactivate() {
    this.activeFilters.reset();
  }
}
