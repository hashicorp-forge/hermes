import Route from "@ember/routing/route";
import RouterService from "@ember/routing/router-service";
import { inject as service } from "@ember/service";
import { dasherize } from "@ember/string";
import AlgoliaService from "hermes/services/algolia";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import ConfigService from "hermes/services/config";
import HermesFlashMessagesService from "hermes/services/flash-messages";
import ProductAreasService from "hermes/services/product-areas";
import { HermesDocument } from "hermes/types/document";
import { SearchResponse } from "instantsearch.js";

export default class AuthenticatedProductAreasProductAreaRoute extends Route {
  @service("config") declare configSvc: ConfigService;
  @service declare router: RouterService;
  @service declare algolia: AlgoliaService;
  @service declare authenticatedUser: AuthenticatedUserService;
  @service declare flashMessages: HermesFlashMessagesService;
  @service declare productAreas: ProductAreasService;

  async model(params: { product_area_id: string }) {
    const searchIndex =
      this.configSvc.config.algolia_docs_index_name + "_createdTime_desc";

    if (this.authenticatedUser.subscriptions) {
      void this.authenticatedUser.fetchSubscriptions.perform();
    } else {
      await this.authenticatedUser.fetchSubscriptions.perform();
    }

    const product = params.product_area_id.replace(/-/g, " ");

    const searchResponse = (await this.algolia.getDocResults.perform(
      searchIndex,
      {
        docType: [],
        owners: [],
        status: [],
        product: [product],
      },
    )) as SearchResponse<unknown>;

    const docs = searchResponse.hits as HermesDocument[];

    if (docs.length === 0) {
      const productAreasIndex = this.productAreas.index;
      const productAreasKeys = Object.keys(productAreasIndex);

      const productAreasDasherized = productAreasKeys.map((productArea) => {
        return dasherize(productArea);
      });

      const productAreaIsValid = productAreasDasherized.includes(
        params.product_area_id,
      );

      if (!productAreaIsValid) {
        this.flashMessages.critical(
          `"${params.product_area_id}" is not a valid product area.`,
          {
            title: "Product area not found",
          },
        );
        this.router.transitionTo("authenticated.dashboard");
      }
    }

    const productArea = docs[0]?.product ?? params.product_area_id;
    const { nbHits } = searchResponse;

    return { docs, productArea, nbHits };
  }
}
