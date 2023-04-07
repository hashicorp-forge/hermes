import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import SessionService from "hermes/services/session";

export default class AuthenticatedRoute extends Route {
  @service declare session: SessionService;
  @service declare authenticatedUser: AuthenticatedUserService;

  async beforeModel() {
    /**
     * If the `loadInfo` task returns a 401, it will bubble up to the
     * application error method which invalidates the session
     * and redirects to the auth screen.
     */
    await this.authenticatedUser.loadInfo.perform();
    void this.session.pollForExpiredAuth.perform();
  }
}
