import Component from "@glimmer/component";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";
import RouterService from "@ember/routing/router-service";
import { tracked } from "@glimmer/tracking";
import {
  FacetDropdownGroups,
  FacetDropdownObjectDetails,
  FacetDropdownObjects,
} from "hermes/types/facets";
import { FacetNames } from "./facet-dropdown";

export enum SortByValue {
  DateDesc = "dateDesc",
  DateAsc = "dateAsc",
}

interface ToolbarFilters {
  docType: string[];
  owners: string[];
  status: string[];
  product: string[];
}

interface ToolbarComponentSignature {
  Args: {
    facets: FacetDropdownGroups;
    sortControlIsHidden?: boolean;
  };
}

export default class ToolbarComponent extends Component<ToolbarComponentSignature> {
  @service declare router: RouterService;

  @tracked sortBy: SortByValue = SortByValue.DateDesc;

  protected get currentRouteName() {
    return this.router.currentRouteName;
  }

  protected get getSortByLabel() {
    if (this.sortBy === SortByValue.DateDesc) {
      return "Newest";
    } else {
      return "Oldest";
    }
  }

  /**
   * Whether the owner facet is disabled.
   * True on the My Docs and My Drafts screens.
   */
  protected get ownerFacetIsDisabled() {
    switch (this.currentRouteName) {
      case "authenticated.my":
      case "authenticated.drafts":
        return true;
      default:
        return false;
    }
  }

  /**
   * Whether the sort control is disabled.
   * True when there are no drafts or docs.
   */
  protected get sortControlIsDisabled() {
    return Object.keys(this.args.facets).length === 0;
  }

  /**
   * The statuses available as filters.
   */
  protected get statuses(): FacetDropdownObjects | null {
    let statuses: FacetDropdownObjects = {};
    for (let status in this.args.facets.status) {
      if (
        status === "Approved" ||
        status === "In-Review" ||
        status === "In Review" ||
        status === "Obsolete" ||
        status === "WIP"
      ) {
        statuses[status] = this.args.facets.status[
          status
        ] as FacetDropdownObjectDetails;
      }
    }

    if (Object.keys(statuses).length === 0) {
      // This will disable the status dropdown
      return null;
    } else {
      return statuses;
    }
  }

  /**
   * Click handler for the facet dropdowns.
   * Updates the query params based on the facet value that was clicked.
   */
  @action protected handleClick(name: FacetNames, value: string): void {
    let filters: ToolbarFilters = {
      docType: [],
      owners: [],
      status: [],
      product: [],
    };

    for (const key in this.args.facets) {
      let selectedFacetValues = [];
      let facetObject = this.args.facets[key as FacetNames];

      for (const details in facetObject) {
        if (facetObject?.["selected"]) {
          selectedFacetValues.push(details);
        }
      }
      filters[key as FacetNames] = selectedFacetValues;
    }

    // Update filters based on whether the clicked facet value was previously selected.
    if (
      (this.args.facets[name][value] as FacetDropdownObjectDetails)["selected"]
    ) {
      // Facet value was already selected so we need to remove it.
      const index = filters[name].indexOf(value);
      if (index > -1) {
        filters[name].splice(index, 1);
      }
    } else {
      // Facet value wasn't selected before so now we need to add it.
      filters[name].push(value);
    }

    this.router.transitionTo({
      queryParams: {
        docType: filters["docType"],
        owners: filters["owners"],
        page: 1,
        product: filters["product"],
        status: filters["status"],
      },
    });
  }

  /**
   * Updates the sortBy value and queryParams.
   */
  @action protected updateSortBy(
    value: SortByValue,
    closeDropdown: () => void
  ) {
    this.sortBy = value;

    debugger
    this.router.transitionTo({
      queryParams: {
        sortBy: value,
      },
    });
    closeDropdown();
  }
}
