import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import ConfigService from "hermes/services/config";
import AlgoliaService from "hermes/services/algolia";
import FetchService from "hermes/services/fetch";
import AuthenticatedUserService from "hermes/services/authenticated-user";

export default class SettingsRoute extends Route {
  @service("config") declare configSvc: ConfigService;
  @service("fetch") declare fetchSvc: FetchService;
  @service declare algolia: AlgoliaService;
  @service declare authenticatedUser: AuthenticatedUserService;

  async model(): Promise<string[]> {
    const allProducts = await this.fetchSvc
      .fetch("/api/v1/products")
      .then((resp) => {
        return resp?.json();
      })
      .catch((err) => {
        console.log(`Error requesting products: ${err}`);
      });

    /**
     * Make sure the user's subscriptions are loaded before rendering the page.
     */
    await this.authenticatedUser.fetchSubscriptions.perform();

    return Object.keys(allProducts).sort();
  }
}
