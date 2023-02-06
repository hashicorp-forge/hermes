import Route from "@ember/routing/route";
import RSVP from "rsvp";
import { inject as service } from "@ember/service";
import AlgoliaService from "hermes/services/algolia";
import ConfigService from "hermes/services/config";
import { ResultsRouteParams } from "hermes/types/document-routes";
import ActiveFiltersService from "hermes/services/active-filters";

export default class ResultsRoute extends Route {
  @service("config") declare configSvc: ConfigService;
  @service declare algolia: AlgoliaService;
  @service declare activeFilters: ActiveFiltersService;

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
    this.activeFilters.update(params);

    const searchIndex =
      params.sortBy === "dateAsc"
        ? this.configSvc.config.algolia_docs_index_name + "_createdTime_asc"
        : this.configSvc.config.algolia_docs_index_name + "_createdTime_desc";

    return RSVP.hash({
      facets: this.algolia.getFacets.perform(searchIndex, params),
      results: this.algolia.getDocResults.perform(searchIndex, params),
    });
  }
}
