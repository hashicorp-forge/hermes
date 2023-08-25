import Route from "@ember/routing/route";
import RouterService from "@ember/routing/router-service";
import { inject as service } from "@ember/service";
import ConfigService from "hermes/services/config";
import AlgoliaService from "hermes/services/algolia";
import { DocumentsRouteParams } from "hermes/types/document-routes";
import ActiveFiltersService from "hermes/services/active-filters";
import { SortByValue } from "hermes/components/header/toolbar";

export default class AuthenticatedAllRoute extends Route {
  @service declare router: RouterService;
  @service("config") declare configSvc: ConfigService;
  @service declare algolia: AlgoliaService;
  @service declare activeFilters: ActiveFiltersService;

  // TODO: this should handle the both the projects and documents routes
  // based on the params or transition intent... maybe?

  beforeModel(transition: any) {
    const intent = transition.intent;

    let shouldTransition = false;

    if (intent.name) {
      if (intent.name === "authenticated.all") {
        shouldTransition = true;
      }
    }
    if (intent.url) {
      if (intent.url === "/all" || intent.url === "/all/") {
        shouldTransition = true;
      }
    }

    if (shouldTransition) {
      this.router.transitionTo("authenticated.all.documents");
    }
  }
  async model(params: DocumentsRouteParams) {
    const sortedBy = (params.sortBy as SortByValue) ?? SortByValue.DateDesc;
    const searchIndex =
      params.sortBy === SortByValue.DateAsc
        ? this.configSvc.config.algolia_docs_index_name + "_createdTime_asc"
        : this.configSvc.config.algolia_docs_index_name + "_createdTime_desc";

    let [facets, results] = await Promise.all([
      this.algolia.getFacets.perform(searchIndex, params),
      this.algolia.getDocResults.perform(searchIndex, params),
    ]);

    this.activeFilters.update(params);
    return { facets, results, sortedBy };
  }
}
