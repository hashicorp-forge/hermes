import Route from "@ember/routing/route";
import RouterService from "@ember/routing/router-service";
import Transition from "@ember/routing/transition";
import { inject as service } from "@ember/service";

export default class AuthenticatedMyDocumentsRoute extends Route {
  @service declare router: RouterService;

  beforeModel(transition: Transition) {
    if (transition.to.name === "authenticated.my.index") {
      this.router.transitionTo("authenticated.my.documents");
    }
  }
}
