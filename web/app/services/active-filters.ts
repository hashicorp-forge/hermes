import RouterService from "@ember/routing/router-service";
import Service, { inject as service } from "@ember/service";
import { tracked } from "@glimmer/tracking";
import { DocumentsRouteParams } from "hermes/types/document-routes";
import { ActiveFilters } from "hermes/components/header/toolbar";

const DEFAULT_FILTERS = {
  docType: [],
  status: [],
  product: [],
  owners: [],
};

export default class ActiveFiltersService extends Service {
  @service declare router: RouterService;

  @tracked index: ActiveFilters = DEFAULT_FILTERS;

  update(params: DocumentsRouteParams) {
    this.index = {
      docType: params.docType || [],
      status: params.status || [],
      product: params.product || [],
      owners: params.owners || [],
    };
  }

  reset() {
    this.index = DEFAULT_FILTERS;
  }
}
