import Route from "@ember/routing/route";
import { service } from "@ember/service";
import RouterService from "@ember/routing/router-service";

export default class AuthenticatedDocumentsRoute extends Route {
  @service declare router: RouterService;

  beforeModel() {
    this.router.transitionTo("authenticated.documents");
  }
}
