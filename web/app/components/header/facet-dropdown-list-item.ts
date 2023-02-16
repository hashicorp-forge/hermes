import { action } from "@ember/object";
import RouterService from "@ember/routing/router-service";
import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import { FocusDirection } from "./facet-dropdown-list";
import { tracked } from "@glimmer/tracking";
import { assert } from "@ember/debug";

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

  @tracked _element: HTMLElement | null = null;
  get element() {
    assert("element must exist", this._element);
    return this._element;
  }

  get elementID() {
    return this.element.id;
  }

  protected get id(): number {
    // get the integer at the end of the id
    return parseInt(this.elementID.match(/\d+$/)?.[0] || "0", 10);
  }

  @action registerElement(element: HTMLElement) {
    this._element = element;
    // need an id-change listener to update the id
  }

  protected get currentRouteName(): string {
    return this.router.currentRouteName;
  }

  get isFocused(): boolean {
    if (this.args.menuItemFocusIndex === -1) {
      return false;
    } else {
      return this.args.menuItemFocusIndex === this.id;
    }
  }

  @action protected onMouseenter(e: MouseEvent) {
    let target = e.target;
    assert("target must be an element", target instanceof HTMLElement);
    this._element = target;
    this.args.setFocusTo(this.id);
  }
}
