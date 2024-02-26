import RouterService from "@ember/routing/router-service";
import Service, { inject as service } from "@ember/service";
import { tracked } from "@glimmer/tracking";
import {
  DocumentsRouteParams,
  ResultsRouteParams,
} from "hermes/types/document-routes";
import { ActiveFilters, FacetName } from "hermes/components/header/toolbar";
import { SearchScope } from "hermes/routes/authenticated/results";

export const DEFAULT_FILTERS = {
  [FacetName.DocType]: [],
  [FacetName.Status]: [],
  [FacetName.Product]: [],
  [FacetName.Owners]: [],
  [FacetName.Scope]: SearchScope.All,
};

export default class ActiveFiltersService extends Service {
  @service declare router: RouterService;

  @tracked index: ActiveFilters = DEFAULT_FILTERS;

  update(params: DocumentsRouteParams | ResultsRouteParams) {
    let scope = undefined;

    if ("scope" in params) {
      if (params.scope !== SearchScope.All) {
        scope = params.scope;
      }
    }

    this.index = {
      docType: params.docType || [],
      status: params.status || [],
      product: params.product || [],
      owners: params.owners || [],
      scope: scope,
    };
  }

  reset() {
    this.index = DEFAULT_FILTERS;
  }
}
