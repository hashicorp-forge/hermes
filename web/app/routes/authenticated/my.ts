import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import ConfigService from "hermes/services/config";
import { DocumentsRouteParams } from "hermes/types/document-routes";
import AlgoliaService from "hermes/services/algolia";
import ActiveFiltersService from "hermes/services/active-filters";

export default class AuthenticatedMyRoute extends Route {
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
    sortBy: {
      refreshModel: true,
    },
    status: {
      refreshModel: true,
    },
  };

  async model(params: DocumentsRouteParams) {
    const searchIndex =
      params.sortBy === "dateAsc"
        ? this.configSvc.config.algolia_docs_index_name + "_createdTime_asc"
        : this.configSvc.config.algolia_docs_index_name + "_createdTime_desc";

    let [facets, results] = await Promise.all([
      this.algolia.getFacets.perform(searchIndex, params, true),
      this.algolia.getDocResults.perform(searchIndex, params, true),
    ]);

    this.activeFilters.update(params);

    return { facets, results };
  }
}
