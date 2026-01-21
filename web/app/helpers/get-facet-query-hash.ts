import Helper from "@ember/component/helper";
import { service } from "@ember/service";
import { FacetName } from "hermes/components/header/toolbar";
import { SearchScope } from "hermes/routes/authenticated/results";
import ActiveFiltersService from "hermes/services/active-filters";

interface GetFacetQueryHashHelperSignature {
  Args: {
    Positional: [facetName: string, clickedFilter: string, isSelected: boolean];
  };
  Return: Record<string, unknown>;
}
/**
 * Generates a query hash appropriate for the facet item.
 * If the facet is in the ActiveFiltersService index, it will
 * be removed from the query hash. Otherwise, it'll be added.
 * Used by the FacetDropdown to add/remove filters on click.
 */
export default class GetFacetQueryHashHelper extends Helper<GetFacetQueryHashHelperSignature> {
  @service declare activeFilters: ActiveFiltersService;

  compute(
    positional: [
      facetName: FacetName,
      clickedFilter: string,
      isSelected: boolean,
    ],
  ) {
    let [facetName, clickedFilter, isSelected] = positional;

    if (isSelected) {
      return Object.fromEntries(
        Object.entries(this.activeFilters.index).map(([key, value]) => {
          if (typeof value === "string") {
            return [key, value];
          } else {
            return [key, value?.filter((filter) => filter !== clickedFilter)];
          }
        }),
      );
    } else {
      return {
        ...this.activeFilters.index,
        [facetName]: [
          ...(this.activeFilters.index[facetName] || []),
          clickedFilter,
        ],
        page: 1,
      };
    }
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "get-facet-query-hash": typeof GetFacetQueryHashHelper;
  }
}
