import { action } from "@ember/object";
import RouterService from "@ember/routing/router-service";
import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import { FocusDirection } from "./facet-dropdown";
import { tracked } from "@glimmer/tracking";
import { assert } from "@ember/debug";

interface HeaderFacetDropdownListItemComponentSignature {
  Args: {
    focusedItemIndex: number;
    value: string;
    role: string;
    count: number;
    selected: boolean;
    setFocusedItemIndex: (
      focusDirection: FocusDirection | number,
      maybeScrollIntoView?: boolean
    ) => void;
  };
}

export default class HeaderFacetDropdownListItemComponent extends Component<HeaderFacetDropdownListItemComponentSignature> {
  @service declare router: RouterService;

  /**
   * The element reference, set on insertion and updated on mouseenter.
   * Used to compute the element's ID, which may change when the list is filtered.
   */
  @tracked private _element: HTMLElement | null = null;

  /**
   * An asserted-true reference to the element.
   */
  protected get element() {
    assert("element must exist", this._element);
    return this._element;
  }

  /**
   * The element's domID, e.g., "facet-dropdown-list-item-0"
   * Which is computed by the parent component on render and when
   * the FacetList is filtered. Parsed by `this.id` to get the
   * numeric identifier for the element.
   */
  private get elementID() {
    return this.element.id;
  }

  /**
   * The current route name, used to set the LinkTo's @route
   */
  protected get currentRouteName(): string {
    return this.router.currentRouteName;
  }

  /**
   * A numeric identifier for the element based on its id,
   * as computed by the parent component on render and when
   * the FacetList is filtered. Strips everything but the trailing number.
   * Used to apply classes and aria-selected, and to direct the parent component's
   * focus action toward the correct element.
   */
  protected get id(): number {
    return parseInt(this.elementID.match(/\d+$/)?.[0] || "0", 10);
    // TODO: can this be more human readable?
  }

  /**
   * Whether the element is aria-focused.
   * Used to determine whether to apply the "focused" class
   * and to set the `aria-selected` attribute.
   */
  protected get isFocused(): boolean {
    if (!this._element) {
      // True when first computed, which happens
      // before the element is inserted and registered.
      return false;
    }

    if (this.args.focusedItemIndex === -1) {
      return false;
    }

    return this.args.focusedItemIndex === this.id;
  }

  /**
   * Sets our local `element` reference to mouse target,
   * to capture its ID, which may change when the list is filtered.
   * Then, calls the parent component's `setFocusedItemIndex` action,
   * directing focus to the current element.
   */
  @action protected onMouseenter(e: MouseEvent) {
    let target = e.target;
    assert("target must be an element", target instanceof HTMLElement);
    this._element = target;
    this.args.setFocusedItemIndex(this.id, false);
  }

  /**
   * The action called on element insertion. Sets the local `element`
   * reference to the domElement we know to be our target.
   */
  @action registerElement(element: HTMLElement) {
    this._element = element;
  }
}
