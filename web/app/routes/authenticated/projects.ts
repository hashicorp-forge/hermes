import Route from "@ember/routing/route";
import RouterService from "@ember/routing/router-service";
import { inject as service } from "@ember/service";
import FlagsService from "hermes/services/flags";

export default class AuthenticatedProjectsRoute extends Route {
  @service declare flags: FlagsService;
  @service declare router: RouterService;

  beforeModel() {
    if (!this.flags.projects) {
      this.router.transitionTo("authenticated.dashboard");
    }
  }
}
