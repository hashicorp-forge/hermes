import { assert } from "@ember/debug";
import { action } from "@ember/object";
import RouterService from "@ember/routing/router-service";
import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { FocusDirection } from ".";
import { next } from "@ember/runloop";

interface XHdsDropdownListItemComponentSignature {
  Args: {
    role?: string;
    value?: any;
    count?: number;
    selected: boolean;
    focusedItemIndex: number;
    listItemRole: string;
    hideDropdown: () => void;
    onItemClick?: (value: any) => void;
    setFocusedItemIndex: (
      focusDirection: FocusDirection | number,
      maybeScrollIntoView?: boolean
    ) => void;
  };
}

export default class XHdsDropdownListItemComponent extends Component<XHdsDropdownListItemComponentSignature> {
  @service declare router: RouterService;
  /**
   * The element reference, set on insertion and updated on mouseenter.
   * Used to compute the element's ID, which may change when the list is filtered.
   */
  @tracked private _domElement: HTMLElement | null = null;

  get count(): number | undefined {
    return this.args.count;
  }

  get value(): string {
    return this.args.value;
  }

  get selected(): boolean {
    return this.args.selected;
  }

  get role(): string | undefined {
    return this.args.role;
  }

  /**
   * An asserted-true reference to the element.
   */
  protected get domElement() {
    assert("element must exist", this._domElement);
    return this._domElement;
  }

  /**
   * The element's domID, e.g., "facet-dropdown-list-item-0"
   * Which is computed by the parent component on render and when
   * the FacetList is filtered. Parsed by `this.id` to get the
   * numeric identifier for the element.
   */
  private get domElementID() {
    return this.domElement.id;
  }

  /**
   * A numeric identifier for the element based on its id,
   * as computed by the parent component on render and when
   * the FacetList is filtered. Strips everything but the trailing number.
   * Used to apply classes and aria-selected, and to direct the parent component's
   * focus action toward the correct element.
   * Regex reference:
   * \d = Any digit 0-9
   * + = One or more of the preceding token
   * $ = End of input
   */
  private get itemIndexNumber(): number {
    return parseInt(this.domElementID.match(/\d+$/)?.[0] || "0", 10);
  }

  get isAriaSelected(): boolean {
    if (!this._domElement) {
      // True when first computed, which happens
      // before the element is inserted and registered.
      return false;
    }
    if (this.args.focusedItemIndex === -1) {
      return false;
    }
    return this.args.focusedItemIndex === this.itemIndexNumber;
  }

  /**
   * The action called on element insertion. Sets the local `element`
   * reference to the domElement we know to be our target.
   */
  @action registerElement(element: HTMLElement) {
    this._domElement = element;
  }

  @action onClick() {
    if (this.args.onItemClick) {
      this.args.onItemClick(this.args.value);
    }

    /**
     * Closes the dropdown on the next run loop.
     * Done so we don't interfere with Ember's <LinkTo> handling.
     */
    next(() => {
      this.args.hideDropdown();
    });
  }

  /**
   * Sets our local `element` reference to mouse target,
   * to capture its ID, which may change when the list is filtered.
   * Then, calls the parent component's `setFocusedItemIndex` action,
   * directing focus to the current element.
   */
  @action focusMouseTarget(e: MouseEvent) {
    let target = e.target;
    assert("target must be an element", target instanceof HTMLElement);
    this._domElement = target;
    this.args.setFocusedItemIndex(this.itemIndexNumber, false);
  }
}
