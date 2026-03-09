import Route from "@ember/routing/route";
import type RouterService from "@ember/routing/router-service";
import { inject as service } from "@ember/service";
import { dasherize } from "@ember/string";
import type AlgoliaService from "hermes/services/algolia";
import type AuthenticatedUserService from "hermes/services/authenticated-user";
import type ConfigService from "hermes/services/config";
import type HermesFlashMessagesService from "hermes/services/flash-messages";
import type ProductAreasService from "hermes/services/product-areas";
import type StoreService from "hermes/services/store";
import type { HermesDocument } from "hermes/types/document";
import type { SearchResponse } from "instantsearch.js";

export default class AuthenticatedProductAreasProductAreaRoute extends Route {
  @service("config") declare configSvc: ConfigService;
  @service declare router: RouterService;
  @service declare algolia: AlgoliaService;
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
      const searchResponse = (await this.algolia.getDocResults.perform(
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
