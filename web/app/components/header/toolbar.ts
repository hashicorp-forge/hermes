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

interface FacetArrayItem {
  name: FacetName;
  values: FacetDropdownObjects | null;
}

export type ActiveFilters = {
  [name in FacetName]: string[];
};

interface ToolbarComponentSignature {
  Args: {
    facets?: FacetDropdownGroups;
  };
}

export default class ToolbarComponent extends Component<ToolbarComponentSignature> {
  @service declare router: RouterService;
  @service declare activeFilters: ActiveFiltersService;

  get currentRouteName(): string {
    return this.router.currentRouteName;
  }

  /**
   * The statuses available as filters.
   */
  protected get statuses(): FacetDropdownObjects {
    let statuses: FacetDropdownObjects = {};
    for (let status in this.args.facets?.status) {
      if (
        status === "Approved" ||
        status === "In-Review" ||
        status === "In Review" ||
        status === "Obsolete" ||
        status === "WIP"
      ) {
        statuses[status] = this.args.facets?.status[
          status
        ] as FacetDropdownObjectDetails;
      }
    }

    return statuses;
  }

  protected get facets() {
    if (!this.args.facets) return;

    let facetArray: FacetArrayItem[] = [];

    Object.entries(this.args.facets).forEach(([key, value]) => {
      if (key === FacetName.Status) {
        facetArray.push({ name: key, values: this.statuses });
      } else {
        facetArray.push({ name: key as FacetName, values: value });
      }
    });

    const order = ["docType", "status", "product", "owners"];

    facetArray.sort((a, b) => {
      return order.indexOf(a.name) - order.indexOf(b.name);
    });

    return facetArray;
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
