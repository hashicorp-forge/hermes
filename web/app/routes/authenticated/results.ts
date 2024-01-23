import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import AlgoliaService from "hermes/services/algolia";
import ConfigService from "hermes/services/config";
import { ResultsRouteParams } from "hermes/types/document-routes";
import ActiveFiltersService from "hermes/services/active-filters";
import { HermesDocument } from "hermes/types/document";
import StoreService from "hermes/services/store";

export default class ResultsRoute extends Route {
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

    const docOwners = (
      results as { hits: HermesDocument[] } | undefined
    )?.hits.map((doc) => doc.owners?.[0]);

    if (docOwners) {
      // populate the store with doc owners
      await this.store.maybeFetchPeople.perform(docOwners);
    }

    this.activeFilters.update(params);

    return { facets, results };
  }
}
