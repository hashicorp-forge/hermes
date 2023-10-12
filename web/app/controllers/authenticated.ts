import Controller from "@ember/controller";
import RouterService from "@ember/routing/router-service";
import { inject as service } from "@ember/service";

export default class AuthenticatedController extends Controller {
  @service declare router: RouterService;

  protected get standardTemplateIsShown() {
    const routeName = this.router.currentRouteName;
    return routeName !== "authenticated.document" && routeName !== "404";
  }
}
