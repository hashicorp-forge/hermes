import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import ConfigService from "hermes/services/config";
import AlgoliaService from "hermes/services/algolia";
import { DocumentsRouteParams } from "hermes/types/document-routes";
import ActiveFiltersService from "hermes/services/active-filters";
import { SortByValue } from "hermes/components/header/toolbar";
import { SearchResponse } from "instantsearch.js";
import { HermesDocument } from "hermes/types/document";

export default class AuthenticatedAllDocumentsRoute extends Route {
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
      params.sortBy === SortByValue.DateAsc
        ? this.configSvc.config.algolia_docs_index_name + "_createdTime_asc"
        : this.configSvc.config.algolia_docs_index_name + "_createdTime_desc";

    const [facets, _results] = await Promise.all([
      this.algolia.getFacets.perform(searchIndex, params),
      this.algolia.getDocResults.perform(searchIndex, params),
    ]);

    const sortedBy = (params.sortBy as SortByValue) ?? SortByValue.DateDesc;
    const results = _results as SearchResponse<HermesDocument>;

    this.activeFilters.update(params);

    return { facets, results, sortedBy };
  }
}
