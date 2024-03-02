import Component from "@glimmer/component";
import { FacetDropdownObjects } from "hermes/types/facets";
import { inject as service } from "@ember/service";
import RouterService from "@ember/routing/router-service";
import { FacetName } from "./toolbar";

interface HeaderFacetDropdownComponentSignature {
  Element: HTMLDivElement;
  Args: {
    name: FacetName;
    facets?: FacetDropdownObjects | null;
  };
}

export default class HeaderFacetDropdownComponent extends Component<HeaderFacetDropdownComponentSignature> {
  @service declare router: RouterService;

  protected get currentRouteName() {
    return this.router.currentRouteName;
  }

  protected get isDisabled() {
    return !this.args.facets || Object.keys(this.args.facets).length === 0;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Header::FacetDropdown": typeof HeaderFacetDropdownComponent;
  }
}
