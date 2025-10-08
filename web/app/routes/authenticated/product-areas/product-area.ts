import Route from "@ember/routing/route";
import RouterService from "@ember/routing/router-service";
import { service } from "@ember/service";
import { dasherize } from "@ember/string";
import SearchService from "hermes/services/search";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import ConfigService from "hermes/services/config";
import HermesFlashMessagesService from "hermes/services/flash-messages";
import ProductAreasService from "hermes/services/product-areas";
import StoreService from "hermes/services/store";
import { HermesDocument } from "hermes/types/document";
import { SearchResponse } from "hermes/services/search";

export default class AuthenticatedProductAreasProductAreaRoute extends Route {
  @service("config") declare configSvc: ConfigService;
  @service declare router: RouterService;
  @service declare search: SearchService;
  @service declare authenticatedUser: AuthenticatedUserService;
  @service declare flashMessages: HermesFlashMessagesService;
  @service declare productAreas: ProductAreasService;
  @service declare store: StoreService;

  async model(params: { product_area_id: string }) {
    const searchIndex =
      this.configSvc.config.algolia_docs_index_name + "_createdTime_desc";

    if (this.authenticatedUser.subscriptions) {
      void this.authenticatedUser.fetchSubscriptions.perform();
    } else {
      await this.authenticatedUser.fetchSubscriptions.perform();
    }

    let productArea = Object.keys(this.productAreas.index).find((product) => {
      return dasherize(product) === params.product_area_id;
    });

    if (!productArea) {
      this.flashMessages.critical(
        `"${params.product_area_id}" is not a valid product area.`,
        {
          title: "Product area not found",
        },
      );
      this.router.transitionTo("authenticated.dashboard");
    } else {
      const searchResponse = (await this.search.getDocResults.perform(
        searchIndex,
        {
          filters: `product:"${productArea}"`,
        },
      )) as SearchResponse<unknown>;

      const docs = searchResponse.hits as HermesDocument[];
      const { nbHits } = searchResponse;

      // load owner information
      await this.store.maybeFetchPeople.perform(docs);

      return { docs, productArea, nbHits };
    }
  }
}
