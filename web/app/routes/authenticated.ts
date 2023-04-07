import Route from "@ember/routing/route";
import RouterService from "@ember/routing/router-service";
import { inject as service } from "@ember/service";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import SessionService from "hermes/services/session";

export default class AuthenticatedRoute extends Route {
  @service declare session: SessionService;
  @service declare authenticatedUser: AuthenticatedUserService;
  @service declare router: RouterService;

  async beforeModel() {
    // If this call returns a 401 the application error method
    // will invalidate the session and redirect to the auth screen.
    await this.authenticatedUser.loadInfo.perform();
    void this.session.pollForExpiredAuth.perform();
  }
}
