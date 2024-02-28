import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import { SearchScope } from "hermes/routes/authenticated/results";
import ActiveFiltersService from "hermes/services/active-filters";

interface HeaderActiveFilterListComponentSignature {
  Args: {};
}

export default class HeaderActiveFilterListComponent extends Component<HeaderActiveFilterListComponentSignature> {
  @service declare activeFilters: ActiveFiltersService;

  /**
   * The route's default query parameters. Used by the
   * "Clear All" button to reset the filters.
   */
  protected defaultQuery = {
    scope: SearchScope.All,
    docType: [],
    owners: [],
    product: [],
    status: [],
    page: 1,
  };

  /**
   * A flat array of active filters, excluding "All" if it is present.
   * Looped through in the template to render the filters.
   */
  protected get shownFilters() {
    const objectValues = Object.values(this.activeFilters.index)
      .flat()
      .compact();

    return objectValues.filter((value) => value !== SearchScope.All);
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Header::ActiveFilterList": typeof HeaderActiveFilterListComponent;
  }
}
