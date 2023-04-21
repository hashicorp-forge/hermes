import Component from "@glimmer/component";
import { SortByFacets, SortByValue } from "./toolbar";
import { inject as service } from "@ember/service";
import RouterService from "@ember/routing/router-service";

interface HeaderSortDropdownComponentSignature {
  Args: {
    label: string;
    facets: SortByFacets;
    disabled: boolean;
    currentSortByValue: SortByValue;
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
