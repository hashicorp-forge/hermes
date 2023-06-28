import Component from "@glimmer/component";
import { FacetDropdownObjects } from "hermes/types/facets";
import { inject as service } from "@ember/service";
import RouterService from "@ember/routing/router-service";

interface HeaderFacetDropdownComponentSignature {
  Element: HTMLDivElement;
  Args: {
    label: string;
    facets: FacetDropdownObjects | null;
    disabled?: boolean;
  };
}

export default class HeaderFacetDropdownComponent extends Component<HeaderFacetDropdownComponentSignature> {
  @service declare router: RouterService;

  protected get currentRouteName() {
    return this.router.currentRouteName;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Header::FacetDropdown": typeof HeaderFacetDropdownComponent;
  }
}
