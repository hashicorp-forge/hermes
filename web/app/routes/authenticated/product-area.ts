import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import ConfigService from "hermes/services/config";
import AlgoliaService from "hermes/services/algolia";
import FetchService from "hermes/services/fetch";
import AuthenticatedUserService from "hermes/services/authenticated-user";

export default class ProductAreaRoute extends Route {
  @service("config") declare configSvc: ConfigService;
  @service("fetch") declare fetchSvc: FetchService;
  @service declare algolia: AlgoliaService;
  @service declare authenticatedUser: AuthenticatedUserService;

  // @ts-ignore
  async model(params, transition) {
    const productName = params.product_area_id;
    const searchIndex =
      this.configSvc.config.algolia_docs_index_name + "_createdTime_desc";

    // Used to show the subscribed/unsubscribed state
    await this.authenticatedUser.fetchSubscriptions.perform();

    return await this.algolia.getDocResults.perform(searchIndex, {
      docType: [],
      owners: [],
      status: [],
      product: [productName],
    });
  }
}
