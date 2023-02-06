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
import { assert } from "@ember/debug";
import ToolbarService from "hermes/services/toolbar";

export enum SortByValue {
  DateDesc = "dateDesc",
  DateAsc = "dateAsc",
}

export type ActiveToolbarFilters = {
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
  @service declare toolbar: ToolbarService;

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
          index = this.toolbar.docTypeFilters.indexOf(value);
          break;
        case FacetName.Owners:
          index = this.toolbar.ownerFilters.indexOf(value);
          break;
        case FacetName.Product:
          index = this.toolbar.productFilters.indexOf(value);
          break;
        case FacetName.Status:
          index = this.toolbar.statusFilters.indexOf(value);
          break;
      }

      if (index > -1) {
        switch (name) {
          case FacetName.DocType:
            this.toolbar.docTypeFilters.splice(index, 1);
            break;
          case FacetName.Owners:
            this.toolbar.ownerFilters.splice(index, 1);
            break;
          case FacetName.Product:
            this.toolbar.productFilters.splice(index, 1);
            break;
          case FacetName.Status:
            this.toolbar.statusFilters.splice(index, 1);
            break;
        }
      }
    } else {
      switch (name) {
        case FacetName.DocType:
          this.toolbar.docTypeFilters.push(value);
          break;
        case FacetName.Owners:
          this.toolbar.ownerFilters.push(value);
          break;
        case FacetName.Product:
          this.toolbar.productFilters.push(value);
          break;
        case FacetName.Status:
          this.toolbar.statusFilters.push(value);
          break;
      }
      // Facet value wasn't selected before so now we need to add it.
    }

    this.router.transitionTo({
      queryParams: {
        docType: this.toolbar.docTypeFilters,
        owners: this.toolbar.ownerFilters,
        page: 1,
        product: this.toolbar.productFilters,
        status: this.toolbar.statusFilters,
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
