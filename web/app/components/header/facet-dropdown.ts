import Component from "@glimmer/component";
import { FacetRecord } from "hermes/types/facets";
import { inject as service } from "@ember/service";
import RouterService from "@ember/routing/router-service";
import { OffsetOptions, Placement } from "@floating-ui/dom";

enum FacetDropdownPosition {
  Left = "left",
  Center = "center",
  Right = "right",
}

interface HeaderFacetDropdownComponentSignature {
  Element: HTMLDivElement;
  Args: {
    label: string;
    facets: FacetRecord | null;
    disabled?: boolean;
    placement?: Placement;
    position: `${FacetDropdownPosition}`;
    offset?: OffsetOptions;
  };
}

export default class HeaderFacetDropdownComponent extends Component<HeaderFacetDropdownComponentSignature> {
  @service declare router: RouterService;

  protected get currentRouteName() {
    return this.router.currentRouteName;
  }

  protected get positionIsLeft() {
    return this.args.position === FacetDropdownPosition.Left;
  }

  protected get positionIsCenter() {
    return this.args.position === FacetDropdownPosition.Center;
  }

  protected get positionIsRight() {
    return this.args.position === FacetDropdownPosition.Right;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Header::FacetDropdown": typeof HeaderFacetDropdownComponent;
  }
}
