import RouterService from "@ember/routing/router-service";
import Service, { service } from "@ember/service";
import { tracked } from "@glimmer/tracking";
import {
  DocumentsRouteParams,
  ResultsRouteParams,
} from "hermes/types/document-routes";
import { ActiveFilters, FacetName } from "hermes/components/header/toolbar";

export const DEFAULT_FILTERS = {
  [FacetName.DocType]: [],
  [FacetName.Status]: [],
  [FacetName.Product]: [],
  [FacetName.Owners]: [],
};

export default class ActiveFiltersService extends Service {
  @service declare router: RouterService;

  @tracked index: ActiveFilters = DEFAULT_FILTERS;

  /**
   * Whether the active filters are empty.
   * True if all the nested arrays are empty.
   */
  get isEmpty() {
    return Object.values(this.index).every((value) => value.length === 0);
  }

  update(params: Partial<DocumentsRouteParams | ResultsRouteParams>) {
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
