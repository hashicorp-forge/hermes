import Route from "@ember/routing/route";
import { service } from "@ember/service";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import ProductAreasService from "hermes/services/product-areas";

export default class SettingsRoute extends Route {
  @service declare authenticatedUser: AuthenticatedUserService;
  @service declare productAreas: ProductAreasService;

  async model(): Promise<string[]> {
    /**
     * Make sure the user's subscriptions are loaded before rendering the page.
     */
    await this.authenticatedUser.fetchSubscriptions.perform();

    return Object.keys(this.productAreas.index).sort();
  }
}
