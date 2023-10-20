import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import ProductAreasService from "hermes/services/product-areas";

interface AuthenticatedNewDocRouteParams {
  docType: string;
}

export default class AuthenticatedNewDocRoute extends Route {
  @service declare productAreas: ProductAreasService;

  queryParams = {
    docType: {
      refreshModel: true,
    },
  };

  async model(params: AuthenticatedNewDocRouteParams) {
    if (!this.productAreas.index) {
      await this.productAreas.fetch.perform();
    }

    return params.docType;
  }
}
