import Component from "@glimmer/component";
import { SortByFacets, SortByValue } from "./toolbar";
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
