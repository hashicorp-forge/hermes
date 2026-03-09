import Route from "@ember/routing/route";
import type RouterService from "@ember/routing/router-service";
import type Transition from "@ember/routing/transition";
import { inject as service } from "@ember/service";

export default class AuthenticatedMyDocumentsRoute extends Route {
  @service declare router: RouterService;

  beforeModel(transition: Transition) {
    if (transition.to?.name === "authenticated.my.index") {
      this.router.transitionTo("authenticated.my.documents");
    }
  }
}
