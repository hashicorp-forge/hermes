import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";

export default class AuthenticatedIndexRoute extends Route {
  @service router;

  redirect() {
    this.router.replaceWith("authenticated.dashboard");
  }
}
