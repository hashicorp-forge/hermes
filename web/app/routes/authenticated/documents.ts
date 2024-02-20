import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import ConfigService from "hermes/services/config";
import AlgoliaService from "hermes/services/algolia";
import { DocumentsRouteParams } from "hermes/types/document-routes";
import ActiveFiltersService from "hermes/services/active-filters";
import { SortByValue } from "hermes/components/header/toolbar";
import StoreService from "hermes/services/store";
import { HermesDocument } from "hermes/types/document";
import { SearchResponse } from "instantsearch.js";

export default class AuthenticatedDocumentsRoute extends Route {
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

    const results = (await this.algolia.getDocResults.perform(
      searchIndex,
      params,
    )) as SearchResponse<HermesDocument>;

    const facets = this.algolia.getFacets(results, params);

    const hits = (results as { hits?: HermesDocument[] }).hits;

    if (hits) {
      // Load owner information
      await this.store.maybeFetchPeople.perform(hits);
    }

    this.activeFilters.update(params);

    return { facets, results, sortedBy };
  }
}
