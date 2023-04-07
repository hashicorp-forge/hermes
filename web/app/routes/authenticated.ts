import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import SessionService from "hermes/services/session";

export default class AuthenticatedRoute extends Route {
  @service declare session: SessionService;
  @service declare authenticatedUser: AuthenticatedUserService;

  async beforeModel(transition: any): Promise<void> {
    // If the user isn't authenticated, transition to the auth screen
    let isLoggedIn = this.session.requireAuthentication(
      transition,
      "authenticate"
    );
    if (isLoggedIn) {
      await this.authenticatedUser.loadInfo.perform();
      void this.session.pollForExpiredAuth.perform();
    }
  }
}
