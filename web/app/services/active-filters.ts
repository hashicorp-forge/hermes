import RouterService from "@ember/routing/router-service";
import Service, { inject as service } from "@ember/service";
import { tracked } from "@glimmer/tracking";
import { DocumentsRouteParams } from "hermes/types/document-routes";
import { ActiveFilters } from "hermes/components/header/toolbar";

export default class ActiveFiltersService extends Service {
  @service declare router: RouterService;

  @tracked index: ActiveFilters = {
    docType: [],
    status: [],
    product: [],
    owners: [],
  };

  update(params: DocumentsRouteParams) {
    this.index = {
      docType: params.docType || [],
      status: params.status || [],
      product: params.product || [],
      owners: params.owners || [],
    };
  }
}
