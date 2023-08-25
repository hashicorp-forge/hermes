import Route from "@ember/routing/route";
import RouterService from "@ember/routing/router-service";
import { inject as service } from "@ember/service";
import ConfigService from "hermes/services/config";
import AlgoliaService from "hermes/services/algolia";
import ActiveFiltersService from "hermes/services/active-filters";

export default class AuthenticatedAllRoute extends Route {
  @service("config") declare configSvc: ConfigService;
  @service declare router: RouterService;
  @service declare algolia: AlgoliaService;
  @service declare activeFilters: ActiveFiltersService;

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
      this.router.transitionTo("authenticated.all.projects");
    }
  }
}
