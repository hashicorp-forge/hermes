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

enum SortByValues {
  DateDesc = "dateDesc",
  DateAsc = "dateAsc",
}
interface ToolbarComponentSignature {
  Args: {
    facets: FacetDropdownGroups;
    sortControlIsHidden?: boolean;
  };
}

export default class ToolbarComponent extends Component<ToolbarComponentSignature> {
  @service declare router: RouterService;

  @tracked sortBy: SortByValues = SortByValues.DateDesc;

  protected get currentRouteName() {
    return this.router.currentRouteName;
  }

  protected get getSortByLabel() {
    if (this.sortBy === SortByValues.DateDesc) {
      return "Newest";
    } else {
      return "Oldest";
    }
  }

  // Disable `owner` dropdown on My and Draft screens
  protected get ownerFacetIsDisabled() {
    switch (this.currentRouteName) {
      case "authenticated.my":
      case "authenticated.drafts":
        return true;
      default:
        return false;
    }
  }

  // True in the case of no drafts or docs
  protected get sortControlIsDisabled() {
    return Object.keys(this.args.facets).length === 0;
  }

  protected get statuses() {
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

  @action protected handleClick(name: FacetNames, value: string) {
    let filters: {
      docType: string[];
      owners: string[];
      status: string[];
      product: string[];
    } = {
      docType: [],
      owners: [],
      status: [],
      product: [],
    };

    for (const key in this.args.facets) {
      let selectedFacetVals = [];

      let facetObject = this.args.facets[key as FacetNames];

      for (const details in facetObject) {
        if (facetObject?.["selected"]) {
          selectedFacetVals.push(details);
        }
      }
      filters[key as FacetNames] = selectedFacetVals;
    }

    // Update filters based on what facet value was clicked and if it was
    // previously selected or not.
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
