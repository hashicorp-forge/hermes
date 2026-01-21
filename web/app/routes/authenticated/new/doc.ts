import Route from "@ember/routing/route";
import { service } from "@ember/service";
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

  model(params: AuthenticatedNewDocRouteParams) {
    return params.docType;
  }
}
