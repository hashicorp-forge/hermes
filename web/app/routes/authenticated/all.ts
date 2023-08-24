import Route from "@ember/routing/route";
import RouterService from "@ember/routing/router-service";
import { inject as service } from "@ember/service";

export default class AuthenticatedAllRoute extends Route {
  @service declare router: RouterService;

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
}
