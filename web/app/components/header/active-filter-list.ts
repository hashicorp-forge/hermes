import { action } from "@ember/object";
import RouterService from "@ember/routing/router-service";
import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import ActiveFiltersService from "hermes/services/active-filters";

interface HeaderActiveFilterListComponentSignature {
  Args: {};
}

export default class HeaderActiveFilterListComponent extends Component<HeaderActiveFilterListComponentSignature> {
  @service declare activeFilters: ActiveFiltersService;
  @service declare router: RouterService;

  get shownFilters() {
    // return a flat array of activeFilters; don't worry about the keys
    return Object.values(this.activeFilters.index).flat();
  }

  defaultQuery = {
    docType: [],
    owners: [],
    product: [],
    status: [],
  };
}
