import { assert } from "@ember/debug";
import RouterService from "@ember/routing/router-service";
import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import { SearchScope } from "hermes/routes/authenticated/results";
import ActiveFiltersService, {
  DEFAULT_FILTERS,
} from "hermes/services/active-filters";

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
    const { filter } = this.args;
    /**
     * If the item is a scope filter, we want to remove all filters except for
     * the query. If the item is not a scope filter, we want to remove the
     * filter from the query.
     */
    switch (filter) {
      case SearchScope.Docs:
      case SearchScope.Projects:
        return {
          ...DEFAULT_FILTERS,
          q: this.router.currentRoute.queryParams["q"],
          scope: SearchScope.All,
        };
      default:
        return {
          ...Object.fromEntries(
            Object.entries(this.activeFilters.index).map(([key, value]) => {
              if (typeof value === "string") {
                return ["scope", SearchScope.All];
              } else {
                return [
                  key,
                  value?.filter((filter) => filter !== this.args.filter),
                ];
              }
            }),
          ),
          page: 1,
        };
    }
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Header::ActiveFilterListItem": typeof HeaderActiveFilterListItemComponent;
  }
}
