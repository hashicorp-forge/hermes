import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import ConfigService from "hermes/services/config";
import SessionService from "hermes/services/session";

export default class AuthenticatedRoute extends Route {
  @service("config") declare configSvc: ConfigService;
  @service declare session: SessionService;
  @service declare authenticatedUser: AuthenticatedUserService;

  beforeModel(transition: any) {
    /**
     * If using Google auth, check if the session is authenticated.
     * If unauthenticated, it will redirect to the auth screen.
     */
    if (!this.configSvc.config.skip_google_auth) {
      this.session.requireAuthentication(transition, "authenticate");
    }
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
     * Kick off the task to poll for expired auth.
     */
    void this.session.pollForExpiredAuth.perform();
  }
}
