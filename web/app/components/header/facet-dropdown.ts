import Component from "@glimmer/component";
import { action } from "@ember/object";
import { FacetDropdownObjects } from "hermes/types/facets";
import { inject as service } from "@ember/service";
import RouterService from "@ember/routing/router-service";
import { next } from "@ember/runloop";

interface HeaderFacetDropdownComponentSignature {
  Element: HTMLDivElement;
  Args: {
    label: string;
    facets?: FacetDropdownObjects | null;
    disabled: boolean;
  };
}

export default class HeaderFacetDropdownComponent extends Component<HeaderFacetDropdownComponentSignature> {
  @service declare router: RouterService;

  protected get currentRouteName(): string {
    return this.router.currentRouteName;
  }

  protected get firstTenFacets(): FacetDropdownObjects {
    if (!this.args.facets) {
      return {};
    }
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

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Header::FacetDropdown": typeof HeaderFacetDropdownComponent;
  }
}
