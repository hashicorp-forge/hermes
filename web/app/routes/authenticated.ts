import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import SessionService from "hermes/services/session";

export default class AuthenticatedRoute extends Route {
  @service declare session: SessionService;
  @service declare authenticatedUser: AuthenticatedUserService;
  @service declare torii: unknown;

  beforeModel(transition: any) {
    /**
     * Checks if the session is authenticated in the front end.
     * If unauthenticated, it will redirect to the auth screen
     */
    this.session.requireAuthentication(transition, "authenticate");
  }

  async afterModel() {
    await this.authenticatedUser.loadInfo.perform();
    void this.session.pollForExpiredAuth.perform();
  }
}
