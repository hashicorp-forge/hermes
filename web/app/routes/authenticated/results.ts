import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import AlgoliaService from "hermes/services/algolia";
import ConfigService from "hermes/services/config";
import { ResultsRouteParams } from "hermes/types/document-routes";
import ActiveFiltersService from "hermes/services/active-filters";
import StoreService from "hermes/services/store";
import { HermesDocument } from "hermes/types/document";

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
    const searchIndex = this.configSvc.config.algolia_docs_index_name;

    let [facets, results] = await Promise.all([
      this.algolia.getFacets.perform(searchIndex, params),
      this.algolia.getDocResults.perform(searchIndex, params),
    ]);

    const hits = (results as { hits?: HermesDocument[] }).hits;

    if (hits) {
      // Load owner information
      await this.store.maybeFetchPeople.perform(hits);
    }

    this.activeFilters.update(params);

    return { facets, results };
  }

  /**
   * The actions to run when the route is deactivated.
   * Resets the active filters for the next time the route is activated.
   */
  deactivate() {
    this.activeFilters.reset();
  }
}
