import { action } from "@ember/object";
import RouterService from "@ember/routing/router-service";
import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import { FocusDirection } from "./facet-dropdown-list";
import { tracked } from "@glimmer/tracking";

interface HeaderFacetDropdownListItemComponentSignature {
  Element: HTMLLIElement;
  Args: {
    menuItemFocusIndex: number;
    value: string;
    count: number;
    selected: boolean;
    setFocusTo: (focusDirection: FocusDirection | number) => void;
    setActiveDescendant(id: string): void;
  };
}

export default class HeaderFacetDropdownListItemComponent extends Component<HeaderFacetDropdownListItemComponentSignature> {
  @service declare router: RouterService;

  get elementID() {
    return this.element?.id || "";
  }

  protected get id(): number {
    // get the integer at the end of the id
    return parseInt(this.elementID.match(/\d+$/)?.[0] || "0", 10);
  }

  @tracked element: HTMLLIElement | null = null;

  @action registerElement(element: HTMLLIElement) {
    this.element = element;
  }

  protected get currentRouteName(): string {
    return this.router.currentRouteName;
  }

  get isFocused(): boolean {
    return this.args.menuItemFocusIndex === this.id;
  }

  @action protected onMouseover(e: MouseEvent) {
    this.args.setFocusTo(this.id);
  }
}
