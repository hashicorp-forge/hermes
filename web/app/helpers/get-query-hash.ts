import Helper, { helper } from "@ember/component/helper";
import { assert } from "@ember/debug";
import { inject as service } from "@ember/service";
import { FacetName } from "hermes/components/header/toolbar";
import ActiveFiltersService from "hermes/services/active-filters";

export default class GetQueryHashHelper extends Helper {
  @service declare activeFilters: ActiveFiltersService;
  compute([facetName, clickedFilter, isSelected]: [
    string,
    string,
    boolean,
    () => void
  ]) {
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
      assert('translatedFacetName must be defined', translatedFacetName);
      return {
        ...this.activeFilters.index,
        [translatedFacetName]: [
          ...(this.activeFilters.index[translatedFacetName] || []),
          clickedFilter,
        ],
      };
    }
  }
}
