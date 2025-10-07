import Route from "@ember/routing/route";
import { service } from "@ember/service";
import ConfigService from "hermes/services/config";
import SearchService from "hermes/services/search";
import { DocumentsRouteParams } from "hermes/types/document-routes";
import ActiveFiltersService from "hermes/services/active-filters";
import { SortByValue } from "hermes/components/header/toolbar";
import StoreService from "hermes/services/store";
import { HermesDocument } from "hermes/types/document";
import { SearchResponse } from "instantsearch.js";

export default class AuthenticatedDocumentsRoute extends Route {
  @service("config") declare configSvc: ConfigService;
  @service declare search: SearchService;
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
    sortBy: {
      refreshModel: true,
    },
    status: {
      refreshModel: true,
    },
  };

  async model(params: DocumentsRouteParams) {
    const sortedBy = params.sortBy ?? SortByValue.DateDesc;

    const searchIndex =
      params.sortBy === "dateAsc"
        ? this.configSvc.config.algolia_docs_index_name + "_createdTime_asc"
        : this.configSvc.config.algolia_docs_index_name + "_createdTime_desc";

    const [facets, results] = await Promise.all([
      this.search.getFacets.perform(searchIndex, params),
      this.search.getDocResults.perform(searchIndex, params),
    ]);

    const typedResults = results as SearchResponse<HermesDocument>;
    const hits = typedResults.hits;

    if (hits) {
      // Load owner information
      await this.store.maybeFetchPeople.perform(hits);
    }

    this.activeFilters.update({ ...params, scope: undefined });
    return {
      facets,
      results: typedResults,
      sortedBy,
    };
  }
}
