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
   * Function to return whether a dropdown should be disabled.
   * If the facet is not available, it should be disabled, otherwise
   * it should be enabled unless there are active filters for that facet.
   */
  private isDropdownDisabled(facet: FacetName): boolean {
    if (!this.args.facets?.[facet]) {
      return true;
    }
    return this.activeFilters.index[facet].length !== 0;
  }

  /**
   * Whether the docType dropdown should be disabled.
   * True if the docType facet is available and not active.
   */
  protected get docTypeDropdownIsDisabled(): boolean {
    return this.isDropdownDisabled(FacetName.DocType);
  }

  /**
   * Whether the status dropdown should be disabled.
   * True if the status facet is available and not active.
   */
  protected get statusDropdownIsDisabled(): boolean {
    return this.isDropdownDisabled(FacetName.Status);
  }

  /**
   * Whether the product dropdown should be disabled.
   * True if the product facet is available and not active.
   */
  protected get productDropdownIsDisabled(): boolean {
    return this.isDropdownDisabled(FacetName.Product);
  }

  /**
   * Whether the owners dropdown should be disabled.
   * True if the owners facet is available and not active.
   */
  protected get ownersDropdownIsDisabled(): boolean {
    return this.isDropdownDisabled(FacetName.Owners);
  }

  /**
   * The statuses available as filters.
   */
  protected get statuses(): FacetDropdownObjects | null {
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
