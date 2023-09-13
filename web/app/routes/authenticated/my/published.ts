import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import { SortByValue } from "hermes/components/header/toolbar";
import ActiveFiltersService from "hermes/services/active-filters";
import AlgoliaService from "hermes/services/algolia";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import ConfigService from "hermes/services/config";
import { HermesDocument } from "hermes/types/document";
import { DocumentsRouteParams } from "hermes/types/document-routes";
import { SearchResponse } from "instantsearch.js";

export default class AuthenticatedMyPublishedRoute extends Route {
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

  async model(params: DocumentsRouteParams) {
    const sortedBy = (params.sortBy as SortByValue) ?? SortByValue.DateDesc;
    const searchIndex =
      params.sortBy === SortByValue.DateAsc
        ? this.configSvc.config.algolia_docs_index_name + "_createdTime_asc"
        : this.configSvc.config.algolia_docs_index_name + "_createdTime_desc";

    let [facets, results] = await Promise.all([
      this.algolia.getFacets.perform(searchIndex, params, true),
      this.algolia.getDocResults.perform(searchIndex, params, true),
    ]);

    this.activeFilters.update(params);

    return {
      facets,
      results: results as SearchResponse<HermesDocument>,
      sortedBy,
    };
  }
}
