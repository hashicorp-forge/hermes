import Route from "@ember/routing/route";
import RouterService from "@ember/routing/router-service";
import { inject as service } from "@ember/service";

export default class AuthenticatedAdminIndexRoute extends Route {
  @service declare router: RouterService;

  beforeModel() {
    // TODO: Reject those who aren't authorized.
    // this.router.replaceWith("authenticated.admin.product-areas");
  }
}
