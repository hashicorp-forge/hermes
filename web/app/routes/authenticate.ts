import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import ConfigService from "hermes/services/config";
import RouterService from "@ember/routing/router-service";
import SessionService from "hermes/services/session";
import config from "hermes/config/environment";

export default class AuthenticateRoute extends Route {
  @service("config") declare configSvc: ConfigService;
  @service declare router: RouterService;
  @service declare session: SessionService;

  async beforeModel() {
    /**
     * If we're skipping auth, redirect right away because this route
     * isn't useful.
     */
    if (this.configSvc.config.skip_google_auth) {
      this.router.replaceWith("/");
      return;
    }

    /**
     * Checks if the session is authenticated,
     * and if it is, transitions to the specified route.
     * If it's not, the route will render normally.
     */
    this.session.prohibitAuthentication("/");
  }
}
