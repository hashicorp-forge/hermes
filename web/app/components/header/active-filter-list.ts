import RouterService from "@ember/routing/router-service";
import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import { SearchScope } from "hermes/routes/authenticated/results";
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
    return Object.values(this.activeFilters.index).flat().compact();
  }

  /**
   * The route's default query parameters. Used to reset the filters.
   */
  defaultQuery = {
    scope: SearchScope.All,
    docType: [],
    owners: [],
    product: [],
    status: [],
    page: 1,
  };
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Header::ActiveFilterList": typeof HeaderActiveFilterListComponent;
  }
}
