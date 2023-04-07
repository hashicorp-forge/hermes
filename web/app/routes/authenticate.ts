import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import SessionService from "hermes/services/session";

export default class AuthenticateRoute extends Route {
  @service declare session: SessionService;

  beforeModel() {
    /**
     * Checks if the session is authenticated,
     * and if it is, transitions to the specified route
     */
    this.session.prohibitAuthentication("/");
  }
}
