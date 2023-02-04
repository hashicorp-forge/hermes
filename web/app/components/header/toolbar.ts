import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";
import RouterService from "@ember/routing/router-service";
import {
  FacetDropdownGroups,
  FacetDropdownObjectDetails,
  FacetDropdownObjects,
  SortByValues,
} from "hermes/types/facets";

interface ToolbarComponentSignature {
  Args: {
    facets: any;
  };
}

export default class ToolbarComponent extends Component<ToolbarComponentSignature> {
  @service declare router: RouterService;

  @tracked sortBy: any = 'dateDesc';

  get currentRouteName(): string {
    return this.router.currentRouteName;
  }

  protected get getSortByLabel(): string {
    if (this.sortBy === "dateDesc") {
        return "Newest";
      }else {
        return "Oldest";
      }

  }

  // Disable `owner` dropdown on My and Draft screens
  protected get ownerFacetIsDisabled(): boolean {
    switch (this.currentRouteName) {
      case "authenticated.my":
      case "authenticated.drafts":
        return true;
      default:
        return false;
    }
  }

  // True in the case of no drafts or docs
  get sortControlIsDisabled(): boolean {
    return Object.keys(this.args.facets).length === 0;
  }

  protected get statuses(): FacetDropdownObjects | null {
    let statuses: FacetDropdownObjects = {};
    // @ts-ignore
    for (let status in this.args.facets["status"]) {
      // Filter out statuses we don't want in the dropdown
      if (
        status === "Approved" ||
        status === "In-Review" ||
        status === "In Review" ||
        status === "Obsolete" ||
        status === "WIP"
      ) {
        // @ts-ignore
        statuses[status] = this.args.facets["status"][
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

  @action protected handleClick(name: any, value: any) {
    // Build filters (selected facet values).
    let filters = {
      docType: [],
      owners: [],
      status: [],
      product: [],
    };

    debugger;

    for (const facet in this.args.facets) {
      let selectedFacetVals = [];
      // @ts-ignore
      for (const facetVal in this.args.facets[facet]) {
        // @ts-ignore
        if (this.args.facets[facet][facetVal]["selected"]) {
          selectedFacetVals.push(facetVal);
        }
      }
      // @ts-ignore
      filters[facet] = selectedFacetVals;
    }

    // Update filters based on what facet value was clicked and if it was
    // previously selected or not.
    // @ts-ignore
    if (this.args.facets[name][value]["selected"]) {
      // Facet value was already selected so we need to remove it.
      // @ts-ignore
      const index = filters[name].indexOf(value);
      if (index > -1) {
        // @ts-ignore
        filters[name].splice(index, 1);
      }
    } else {
      // Facet value wasn't selected before so now we need to add it.
      // @ts-ignore
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

  @action protected updateSortBy(
    value: SortByValues,
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
