import Helper from "@ember/component/helper";
import { assert } from "@ember/debug";
import { inject as service } from "@ember/service";
import { FacetName } from "hermes/components/header/toolbar";
import ActiveFiltersService from "hermes/services/active-filters";

/**
 * Generates a query hash appropriate for the facet item.
 * If the facet is in the ActiveFiltersService index, it will
 * be removed from the query hash. Otherwise, it'll be added.
 * Used by the FacetDropdown to add/remove filters on click.
 */
export default class GetFacetQueryHashHelper extends Helper {
  @service declare activeFilters: ActiveFiltersService;

  compute([facetName, clickedFilter, isSelected]: [
    string,
    string,
    boolean,
    () => void
  ]) {
    // Translate the UI facetName to the one used in the query hash.
    let translatedFacetName;

    switch (facetName) {
      case "Type":
        translatedFacetName = FacetName.DocType;
        break;
      case "Status":
        translatedFacetName = FacetName.Status;
        break;
      case "Product/Area":
        translatedFacetName = FacetName.Product;
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
