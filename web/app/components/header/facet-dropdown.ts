import Component from "@glimmer/component";
import { FacetDropdownObjects } from "hermes/types/facets";
import { FacetName } from "./toolbar";

interface HeaderFacetDropdownComponentSignature {
  Element: HTMLDivElement;
  Args: {
    name: FacetName;
    facets?: FacetDropdownObjects | null;
  };
}

export default class HeaderFacetDropdownComponent extends Component<HeaderFacetDropdownComponentSignature> {
  protected get isDisabled() {
    return !this.args.facets || Object.keys(this.args.facets).length === 0;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Header::FacetDropdown": typeof HeaderFacetDropdownComponent;
  }
}
