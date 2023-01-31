import Component from "@glimmer/component";
import { action } from "@ember/object";
import { getOwner } from "@ember/application";
import { inject as service } from "@ember/service";

export default class Toolbar extends Component {
  @service router;
  @service toolbar;

  get currentRouteName() {
    return this.router.currentRouteName;
  }

  get getSortByLabel() {
    switch (this.toolbar.sortBy) {
      case "dateDesc":
        return "Newest";
      case "dateAsc":
        return "Oldest";
    }
  }

  // Disable `owner` dropdown on My and Draft screens
  get ownerFacetIsDisabled() {
    switch (this.currentRouteName) {
      case "authenticated.my":
      case "authenticated.drafts":
        return true;
      default:
        return false;
    }
  }

  // True in the case of no drafts or docs
  get sortControlIsDisabled() {
    return Object.keys(this.args.facets).length === 0;
  }

  // TODO: Remove when status facet values are cleaned up
  get statuses() {
    let statuses = {};
    for (let status in this.args.facets.status) {
      if (
        status === "Approved" ||
        status === "In-Review" ||
        status === "In Review" ||
        status === "Obsolete" ||
        status === "WIP"
      ) {
        statuses[status] = this.args.facets.status[status];
      }
    }

    if (Object.keys(statuses).length === 0) {
      // This will disable the status dropdown
      return null;
    } else {
      return statuses;
    }
  }

  @action
  handleClick(name, value) {
    // Build filters (selected facet values).
    let filters = {
      docType: [],
      owners: [],
      status: [],
      product: [],
    };
    for (const facet in this.args.facets) {
      let selectedFacetVals = [];
      for (const facetVal in this.args.facets[facet]) {
        if (this.args.facets[facet][facetVal]["selected"]) {
          selectedFacetVals.push(facetVal);
        }
      }
      filters[facet] = selectedFacetVals;
    }

    // Update filters based on what facet value was clicked and if it was
    // previously selected or not.
    if (this.args.facets[name][value]["selected"]) {
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

  @action
  updateSortBy(value, closeDropdown) {
    this.toolbar.sortBy = value;

    this.router.transitionTo({
      queryParams: {
        sortBy: value,
      },
    });
    closeDropdown();
  }
}
