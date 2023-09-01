import Component from "@glimmer/component";
import { FacetRecords } from "hermes/types/facets";

interface HeaderComponentSignature {
  Args: {
    facets?: FacetRecords;
  };
}

export default class HeaderComponent extends Component<HeaderComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    Header: typeof HeaderComponent;
  }
}
