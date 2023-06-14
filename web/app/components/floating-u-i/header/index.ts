import Component from "@glimmer/component";
import { FacetDropdownGroups } from "hermes/types/facets";

interface HeaderComponentSignature {
  Args: {
    facets: FacetDropdownGroups;
    sortControlIsHidden?: boolean;
  };
}

export default class extends Component<HeaderComponentSignature> {}
declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {}
}
