import Component from "@glimmer/component";
import { action } from "@ember/object";
import { FacetDropdownObjects } from "hermes/types/facets";
import { inject as service } from "@ember/service";
import RouterService from "@ember/routing/router-service";
import { next } from "@ember/runloop";

interface FacetDropdownComponentSignature {
  Args: {
    label: string;
    facets: FacetDropdownObjects;
    disabled: boolean;
  };
}

export default class FacetDropdownComponent extends Component<FacetDropdownComponentSignature> {
  @service declare router: RouterService;

  protected get currentRouteName(): string {
    return this.router.currentRouteName;
  }

  protected get firstTenFacets(): FacetDropdownObjects {
    let firstTenEntries = Object.entries(this.args.facets).slice(0, 10);
    let firstTenFacetsObjects = Object.fromEntries(firstTenEntries);
    return firstTenFacetsObjects;
  }

  /**
   * Closes the dropdown on the next run loop.
   * Done so we don't interfere with Ember's <LinkTo> handling.
   */
  @action protected delayedCloseDropdown(closeDropdown: () => void) {
    next(() => {
      closeDropdown();
    });
  }
}
