import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import ConfigService from "hermes/services/config";
import RouterService from "@ember/routing/router-service";
import SessionService from "hermes/services/session";

export default class AuthenticateRoute extends Route {
  @service("config") declare configSvc: ConfigService;
  @service declare router: RouterService;
  @service declare session: SessionService;

  beforeModel() {
    /**
     * If we're skipping Google auth, redirect right away because this route
     * isn't useful.
     */
    if (this.configSvc.config.skip_google_auth) {
      this.router.replaceWith("/");
    }

    /**
     * Checks if the session is authenticated,
     * and if it is, transitions to the specified route
     */
    this.session.prohibitAuthentication("/");
  }
}
