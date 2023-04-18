import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import ConfigService from "hermes/services/config";
import SessionService from "hermes/services/session";

export default class AuthenticateRoute extends Route {
  @service("config") declare configSvc: ConfigService;
  @service declare session: SessionService;

  beforeModel() {
    /**
     * If using Google auth, checks if the session is authenticated,
     * and if it is, transitions to the specified route
     */
    if (!this.configSvc.config.bypass_google_auth) {
      this.session.prohibitAuthentication("/");
    }
  }
}
