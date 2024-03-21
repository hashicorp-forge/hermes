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
import DocumentTypesService from "hermes/services/document-types";
import ProductAreasService from "hermes/services/product-areas";

export default class AuthenticatedDocumentsRoute extends Route {
  @service("config") declare configSvc: ConfigService;
  @service declare algolia: AlgoliaService;
  @service declare activeFilters: ActiveFiltersService;
  @service declare documentTypes: DocumentTypesService;
  @service declare productAreas: ProductAreasService;
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

    /**
     * If we haven't yet fetched docTypes, or products
     * do so now for use in the filter dropdowns.
     */
    const maybeFetchDocTypesPromise = !this.documentTypes.index
      ? this.documentTypes.fetch.perform()
      : Promise.resolve();

    const maybeFetchProductsPromise = !this.productAreas.index
      ? this.productAreas.fetch.perform()
      : Promise.resolve();

    const [facets, results] = await Promise.all([
      this.algolia.getFacets.perform(searchIndex, params),
      this.algolia.getDocResults.perform(searchIndex, params),
      maybeFetchDocTypesPromise,
      maybeFetchProductsPromise,
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
