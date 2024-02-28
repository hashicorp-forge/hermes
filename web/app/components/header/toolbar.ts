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
import { SearchScope } from "hermes/routes/authenticated/results";
import { assert } from "@ember/debug";

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
    facets?: Partial<FacetDropdownGroups>;
    scope?: SearchScope;
    query?: string;
  };
}

export default class ToolbarComponent extends Component<ToolbarComponentSignature> {
  @service declare router: RouterService;
  @service declare activeFilters: ActiveFiltersService;

  get currentRouteName(): string {
    return this.router.currentRouteName;
  }

  /**
   * Whether the facets are shown.
   * True as long as the scope is not "All".
   */
  protected get facetsAreShown() {
    return this.args.scope !== SearchScope.All;
  }

  /**
   * The statuses available as filters.
   */
  protected get statuses(): FacetDropdownObjects {
    let statuses: FacetDropdownObjects = {};

    for (let status in this.args.facets?.status) {
      switch (status) {
        case "Approved":
        case "In-Review":
        case "In Review":
        case "Obsolete":
        case "WIP":
          statuses[status] = this.args.facets?.status[
            status
          ] as FacetDropdownObjectDetails;
          break;
      }
    }

    return statuses;
  }

  /**
   * The facets, depending on the scope.
   * If the facets object is empty, we return the default facets.
   * Otherwise, we return the facets from the object.
   */
  protected get facets() {
    assert("facets must exist", this.args.facets);

    const facetsObjectIsEmpty = Object.keys(this.args.facets).length === 0;

    if (facetsObjectIsEmpty) {
      switch (this.args.scope) {
        case SearchScope.Docs:
          return [
            {
              name: FacetName.DocType,
              values: null,
            },
            {
              name: FacetName.Status,
              values: null,
            },
            {
              name: FacetName.Product,
              values: null,
            },
            {
              name: FacetName.Owners,
              values: null,
            },
          ];
        case SearchScope.Projects:
          return [
            {
              name: FacetName.Status,
              values: null,
            },
          ];
      }
    }

    let facetArray: FacetArrayItem[] = [];

    Object.entries(this.args.facets).forEach(([key, value]) => {
      if (key === FacetName.Status && this.args.scope === SearchScope.Docs) {
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
