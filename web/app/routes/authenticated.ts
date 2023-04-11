import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import SessionService from "hermes/services/session";

export default class AuthenticatedRoute extends Route {
  @service declare session: SessionService;
  @service declare authenticatedUser: AuthenticatedUserService;

  async beforeModel(transition: any) {
    /**
     * Checks if the session is authenticated in the front end.
     * If unauthenticated, it will redirect to the auth screen
     */
    this.session.requireAuthentication(transition, "authenticate");
  }

  // Note: Only called if the session is authenticated in the front end
  async afterModel() {
    /**
     * Checks if the session is authenticated in the back end.
     * If the `loadInfo` task returns a 401, it will bubble up to the
     * application error method which invalidates the session
     * and redirects to the auth screen.
     */
    await this.authenticatedUser.loadInfo.perform();

    /**
     * If the session is authenticated with the front- and back-ends,
     * kick off the task to poll for expired auth.
     */
    void this.session.pollForExpiredAuth.perform();
  }
}
