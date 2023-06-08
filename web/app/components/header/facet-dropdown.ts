import Component from "@glimmer/component";
import { FacetDropdownObjects } from "hermes/types/facets";
import { inject as service } from "@ember/service";
import RouterService from "@ember/routing/router-service";

interface FacetDropdownComponentSignature {
  Args: {
    label: string;
    facets: FacetDropdownObjects;
    disabled?: boolean;
  };
}

export default class FacetDropdownComponent extends Component<FacetDropdownComponentSignature> {
  @service declare router: RouterService;

  protected get currentRouteName() {
    return this.router.currentRouteName;
  }
}
