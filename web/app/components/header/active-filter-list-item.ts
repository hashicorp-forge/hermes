import RouterService from "@ember/routing/router-service";
import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import ActiveFiltersService from "hermes/services/active-filters";

interface HeaderActiveFilterListItemComponentSignature {
  Args: {
    filter: string;
  };
}

export default class HeaderActiveFilterListItemComponent extends Component<HeaderActiveFilterListItemComponentSignature> {
  @service declare activeFilters: ActiveFiltersService;
  @service declare router: RouterService;

  /**
   * The query hash to use when clicking the filter.
   * I.e., the ActiveFiltersService index minus the current filter.
   */
  get query() {
    return {
      ...Object.fromEntries(
        Object.entries(this.activeFilters.index).map(([key, value]) => [
          key,
          value.filter((filter) => filter !== this.args.filter),
        ])
      ),
      page: 1,
    };
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Header::ActiveFilterListItem": typeof HeaderActiveFilterListItemComponent;
  }
}
