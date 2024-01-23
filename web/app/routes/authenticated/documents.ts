import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import ConfigService from "hermes/services/config";
import AlgoliaService from "hermes/services/algolia";
import { DocumentsRouteParams } from "hermes/types/document-routes";
import ActiveFiltersService from "hermes/services/active-filters";
import { SortByValue } from "hermes/components/header/toolbar";
import { HermesDocument } from "hermes/types/document";
import Store from "@ember-data/store";
import StoreService from "hermes/services/store";

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

    let [facets, results] = await Promise.all([
      this.algolia.getFacets.perform(searchIndex, params),
      this.algolia.getDocResults.perform(searchIndex, params),
    ]);

    this.activeFilters.update(params);

    if (results) {
      const typedResults = results as { hits?: HermesDocument[] };

      const resultsOwners = typedResults.hits?.map(
        (doc: HermesDocument) => doc.owners?.[0],
      );

      await this.store.maybeFetchPeople.perform(resultsOwners);
    }

    return { facets, results, sortedBy };
  }
}
