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
  Scope = "scope",
}

export interface SortByFacets {
  [name: string]: {
    count: number;
    isSelected: boolean;
  };
}

export type ActiveFilters = {
  [name in FacetName]: string[] | string | undefined;
};

interface ToolbarComponentSignature {
  Args: {
    docFacets?: FacetDropdownGroups;
    projectFacets?: FacetDropdownGroups;
    scope: SearchScope;
    query?: string;
  };
}

export default class ToolbarComponent extends Component<ToolbarComponentSignature> {
  @service declare router: RouterService;
  @service declare activeFilters: ActiveFiltersService;

  get currentRouteName(): string {
    return this.router.currentRouteName;
  }

  protected get facetsAreShown() {
    return this.args.scope === SearchScope.Docs;
  }

  /**
   * The statuses available as filters.
   */
  protected get statuses(): FacetDropdownObjects | null {
    let statuses: FacetDropdownObjects = {};
    for (let status in this.args.docFacets?.status) {
      if (
        status === "Approved" ||
        status === "In-Review" ||
        status === "In Review" ||
        status === "Obsolete" ||
        status === "WIP"
      ) {
        statuses[status] = this.args.docFacets?.status[
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
