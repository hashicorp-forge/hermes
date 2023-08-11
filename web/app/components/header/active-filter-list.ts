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

  /**
   * A flat array of all the active filters.
   */
  get shownFilters() {
    return Object.values(this.activeFilters.index).flat();
  }

  /**
   * The route's default query parameters. Used to reset the filters.
   */
  defaultQuery = {
    product: [],
    team: [],
    project: [],
    docType: [],
    owners: [],
    status: [],
    page: 1,
  };
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Header::ActiveFilterList": typeof HeaderActiveFilterListComponent;
  }
}
