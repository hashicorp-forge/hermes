import Controller from "@ember/controller";
import RouterService from "@ember/routing/router-service";
import { service } from "@ember/service";
import { tracked } from "@glimmer/tracking";

export default class AuthenticatedController extends Controller {
  @service declare router: RouterService;

  /**
   * The current search query. Set in the route's `beforeModel` hook
   * when transitioning to the `results` route with a query.
   * Used to populate the search input when dry-loading the results route.
   */
  @tracked query: string | undefined;

  protected get standardTemplateIsShown() {
    const routeName = this.router.currentRouteName;
    return routeName !== "authenticated.document" && routeName !== "404";
  }
}

declare module "@ember/controller" {
  interface Registry {
    authenticated: AuthenticatedController;
  }
}
