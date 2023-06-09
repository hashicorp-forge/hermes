import Component from "@glimmer/component";
import { SortByFacets, SortByValue } from "./toolbar";
import { inject as service } from "@ember/service";
import RouterService from "@ember/routing/router-service";
import { Placement } from "@floating-ui/dom";

interface HeaderSortDropdownComponentSignature {
  Args: {
    label: string;
    facets: SortByFacets;
    disabled: boolean;
    currentSortByValue: SortByValue;
    dropdownPlacement: Placement;
  };
}

export default class HeaderSortDropdownComponent extends Component<HeaderSortDropdownComponentSignature> {
  @service declare router: RouterService;

  get currentRouteName() {
    return this.router.currentRouteName;
  }

  get dateDesc() {
    return SortByValue.DateDesc;
  }

  get dateAsc() {
    return SortByValue.DateAsc;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Header::SortDropdown": typeof HeaderSortDropdownComponent;
  }
}
