import Component from "@glimmer/component";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";
import RouterService from "@ember/routing/router-service";
import {
  FacetDropdownGroups,
  FacetDropdownObjectDetails,
  FacetDropdownObjects,
} from "hermes/types/facets";
import ActiveFiltersService from "hermes/services/active-filters";
import { next } from "@ember/runloop";

export enum SortByValue {
  DateDesc = "dateDesc",
  DateAsc = "dateAsc",
}

export enum SortByLabel {
  Newest = "Newest",
  Oldest = "Oldest",
}

export enum FacetName {
  DocType = "docType",
  Owners = "owners",
  Status = "status",
  Product = "product",
}

export interface SortByFacets {
  [name: string]: {
    count: number;
    isSelected: boolean;
  };
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

  get currentSortByValue() {
    if (!this.router.currentRoute) {
      return SortByValue.DateDesc;
    }
    let sortBy = this.router.currentRoute.queryParams["sortBy"];

    switch (sortBy) {
      case SortByValue.DateAsc:
        return sortBy;
      default:
        return SortByValue.DateDesc;
    }
  }

  protected get getSortByLabel(): SortByLabel {
    if (this.currentSortByValue === SortByValue.DateDesc) {
      return SortByLabel.Newest;
    } else {
      return SortByLabel.Oldest;
    }
  }

  get currentRouteName(): string {
    return this.router.currentRouteName;
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

  get sortByFacets(): SortByFacets {
    return {
      Newest: {
        count: 0,
        isSelected: this.currentSortByValue === SortByValue.DateDesc,
      },
      Oldest: {
        count: 0,
        isSelected: this.currentSortByValue === SortByValue.DateAsc,
      },
    };
  }

  /**
   * Closes the dropdown on the next run loop.
   * Done so we don't interfere with Ember's <LinkTo> handling.
   */
  @action protected delayedCloseDropdown(closeDropdown: () => void) {
    next(() => {
      closeDropdown();
    });
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Header::Toolbar": typeof ToolbarComponent;
  }
}
