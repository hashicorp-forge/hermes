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
import { FacetName } from "./facet-dropdown";
import ActiveFiltersService from "hermes/services/active-filters";

export enum SortByValue {
  DateDesc = "dateDesc",
  DateAsc = "dateAsc",
}

export type ActiveFilters = {
  [name in FacetName]: string[];
};

interface ToolbarComponentSignature {
  Args: {
    facets: FacetDropdownGroups;
    sortControlIsHidden?: boolean;
  };
}

export default class ToolbarComponent extends Component<ToolbarComponentSignature> {
  @service declare router: RouterService;
  @service declare activeFilters: ActiveFiltersService;

  @tracked sortBy: SortByValue = SortByValue.DateDesc;

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
    switch (this.router.currentRouteName) {
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
  @action protected handleClick(name: FacetName, value: string): void {
    // Update filters based on whether the clicked facet value was previously selected.
    if (
      (this.args.facets[name][value] as FacetDropdownObjectDetails)["selected"]
    ) {
      let index: number | undefined = undefined;

      switch (name) {
        case FacetName.DocType:
          index = this.activeFilters.index["docType"].indexOf(value);
          break;
        case FacetName.Owners:
          index = this.activeFilters.index["owners"].indexOf(value);
          break;
        case FacetName.Product:
          index = this.activeFilters.index["product"].indexOf(value);
          break;
        case FacetName.Status:
          index = this.activeFilters.index["status"].indexOf(value);
          break;
      }

      if (index > -1) {
        switch (name) {
          case FacetName.DocType:
            this.activeFilters.index["docType"].splice(index, 1);
            break;
          case FacetName.Owners:
            this.activeFilters.index["owners"].splice(index, 1);
            break;
          case FacetName.Product:
            this.activeFilters.index["product"].splice(index, 1);
            break;
          case FacetName.Status:
            this.activeFilters.index["status"].splice(index, 1);
            break;
        }
      }
    } else {
      switch (name) {
        case FacetName.DocType:
          this.activeFilters.index["docType"].push(value);
          break;
        case FacetName.Owners:
          this.activeFilters.index["owners"].push(value);
          break;
        case FacetName.Product:
          this.activeFilters.index["product"].push(value);
          break;
        case FacetName.Status:
          this.activeFilters.index["status"].push(value);
          break;
      }
      // Facet value wasn't selected before so now we need to add it.
    }

    this.router.transitionTo({
      queryParams: {
        docType: this.activeFilters.index["docType"],
        owners: this.activeFilters.index["owners"],
        page: 1,
        product: this.activeFilters.index["product"],
        status: this.activeFilters.index["status"],
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
    this.router.transitionTo({
      queryParams: {
        sortBy: value,
      },
    });
    closeDropdown();
  }
}
