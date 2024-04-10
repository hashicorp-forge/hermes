import { assert } from "@ember/debug";
import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import ProductAreasService from "hermes/services/product-areas";

export default class AuthenticatedAdminProductAreasProductAreaRoute extends Route {
  @service declare productAreas: ProductAreasService;

  model(params: { product_area_id: string }) {
    /**
     * TODO: Make this an async model that fetches
     * the product area from the server if it's not already loaded.
     */
    const productArea = this.productAreas.index[params.product_area_id];

    assert("product area must exist", productArea);

    return {
      name: params.product_area_id,
      ...productArea,
    };
  }
}
