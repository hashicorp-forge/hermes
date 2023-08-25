import Route from "@ember/routing/route";
import RouterService from "@ember/routing/router-service";
import { inject as service } from "@ember/service";

export default class AuthenticatedAllRoute extends Route {
  @service declare router: RouterService;

  beforeModel() {
    this.router.transitionTo("authenticated.documents");
  }
}
