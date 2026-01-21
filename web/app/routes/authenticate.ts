import Route from "@ember/routing/route";
import { service } from "@ember/service";
import ConfigService from "hermes/services/config";
import RouterService from "@ember/routing/router-service";
import SessionService from "hermes/services/session";

export default class AuthenticateRoute extends Route {
  @service("config") declare configSvc: ConfigService;
  @service declare router: RouterService;
  @service declare session: SessionService;

  beforeModel() {
    /**
     * Checks if the session is authenticated,
     * and if it is, transitions to the specified route
     */
    this.session.prohibitAuthentication("/");
  }
}
