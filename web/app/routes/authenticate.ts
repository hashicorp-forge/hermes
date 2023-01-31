import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";

export default class AuthenticateRoute extends Route {
  @service declare session: any;

  beforeModel() {
    this.session.prohibitAuthentication("/");
  }
}
