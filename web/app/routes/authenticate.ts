import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import SessionService from "hermes/services/session";

export default class AuthenticateRoute extends Route {
  @service declare session: SessionService;

  beforeModel() {
    console.log(
      'authenticate this.session prohibitAuthentication("/")',
      this.session.prohibitAuthentication("/")
    );
    this.session.prohibitAuthentication("/");
  }
}
