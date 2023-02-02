import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import ConfigService from "hermes/services/config";
import AuthenticateController from "hermes/controllers/authenticate";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import Transition from "@ember/routing/transition";
import SessionService from "ember-simple-auth/session";

export default class AuthenticatedRoute extends Route {
  @service declare session: SessionService;
  @service declare authenticatedUser: AuthenticatedUserService;
  @service("config") declare configSvc: ConfigService;

  async afterModel(): Promise<void> {
    // Load user info
    await this.authenticatedUser.loadInfo.perform();
  }

  async beforeModel(transition: Transition): Promise<void> {
    // Check if the request requires authentication and if so, preserve the URL
    let requireAuthentication = this.session.requireAuthentication(
      transition,
      "authenticate"
    );

    if (!requireAuthentication && transition.to.name != "authenticated.index") {
      let authenticateController = this.controllerFor(
        "authenticate"
      ) as AuthenticateController;

      // Set previous transition to preserve URL
      authenticateController.previousTransition = transition;
    }
  }
}
