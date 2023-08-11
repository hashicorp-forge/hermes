import Helper from "@ember/component/helper";
import { assert } from "@ember/debug";
import { inject as service } from "@ember/service";
import { FacetName } from "hermes/components/header/toolbar";
import ActiveFiltersService from "hermes/services/active-filters";

interface GetFacetQueryHashHelperSignature {
  Args: {
    Positional: [facetName: string, clickedFilter: string, isSelected: boolean];
  };
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
    positional: [facetName: string, clickedFilter: string, isSelected: boolean]
  ) {
    // Translate the UI facetName to the one used in the query hash.
    let translatedFacetName;
    let [facetName, clickedFilter, isSelected] = positional;

    switch (facetName) {
      case "Type":
        translatedFacetName = FacetName.DocType;
        break;
      case "Status":
        translatedFacetName = FacetName.Status;
        break;
      case "BU":
        translatedFacetName = FacetName.Product;
        break;
      case "Team":
        translatedFacetName = FacetName.Team;
        break;
      case "Project":
        translatedFacetName = FacetName.Project;
        break;
      case "Owner":
        translatedFacetName = FacetName.Owners;
        break;
    }

    if (isSelected) {
      return Object.fromEntries(
        Object.entries(this.activeFilters.index).map(([key, value]) => [
          key,
          value.filter((filter) => filter !== clickedFilter),
        ])
      );
    } else {
      assert("translatedFacetName must be defined", translatedFacetName);
      return {
        ...this.activeFilters.index,
        [translatedFacetName]: [
          ...(this.activeFilters.index[translatedFacetName] || []),
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
