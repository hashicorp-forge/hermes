import Component from "@glimmer/component";
import { FacetDropdownGroups, FacetRecords } from "hermes/types/facets";

interface HeaderComponentSignature {
  Args: {
    facets?: FacetRecords;
    sortControlIsHidden?: boolean;
  };
}

export default class HeaderComponent extends Component<HeaderComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    Header: typeof HeaderComponent;
  }
}
