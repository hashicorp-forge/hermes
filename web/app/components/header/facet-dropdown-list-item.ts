import { action } from "@ember/object";
import RouterService from "@ember/routing/router-service";
import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import { FocusDirection } from "./facet-dropdown";
import { tracked } from "@glimmer/tracking";
import { assert } from "@ember/debug";
import { next } from "@ember/runloop";
import { SortByLabel, SortByValue } from "./toolbar";

enum FacetDropdownAriaRole {
  Option = "option",
  Menuitem = "menuitem",
}

interface HeaderFacetDropdownListItemComponentSignature {
  Element: HTMLAnchorElement;
  Args: {
    /**
     * The label of the facet, e.g., "Type" or "Owner."
     * Used to construct filter query params.
     */
    label: string;
    /**
     * The index of the currently focused item.
     * Used to determine aria-focus.
     */
    focusedItemIndex: number;
    /**
     * The name of the facet, e.g., "Approved," "In-Review."
     * Used primarily to construct the query params.
     */
    value: string;
    /**
     * The role of the list item, e.g., "option" or "menuitem".
     * The if the facetDropdown has a filter input, the role is "option".
     * Otherwise, it's "menuitem".
     */
    role: FacetDropdownAriaRole;
    /**
     * The number of matches associated with the filter.
     * Used to display the badge count.
     */
    count: number;
    /**
     * Whether the item an actively applied filter.
     * Used for checkmark-display logic, and as
     * params for the `get-facet-query-hash` helper
     */
    selected: boolean;
    /**
     * If the dropdown list is the sort control, the current sort value.
     * Used to determine whether to use the `get-facet-query-hash` helper
     * or this class's sortByQueryParams getter.
     */
    currentSortByValue?: SortByValue;
    /**
     * The action called to hide the dropdown.
     * Used to close the dropdown on the next run loop.
     */
    hideDropdown: () => void;
    /**
     * The action called on mouseenter that sets the focused-item index value.
     * Includes a `maybeScrollIntoView` argument that we use to disable
     * mouse-activated scroll manipulation.
     */
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
  @tracked private _domElement: HTMLElement | null = null;

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
   * Regex reference:
   * \d = Any digit 0-9
   * + = One or more of the preceding token
   * $ = End of input
   */
  protected get itemIndexNumber(): number {
    return parseInt(this.domElementID.match(/\d+$/)?.[0] || "0", 10);
  }

  /**
   * Whether the element is aria-selected.
   * Used to determine whether to apply the "focused" class
   * and to set the `aria-selected` attribute.
   */
  protected get isAriaSelected(): boolean {
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
   * The query hash to use when the a sortBy filter is selected.
   */
  protected get sortByQueryParams(): { sortBy: SortByValue } | void {
    //  The sortBy filter is the only facet that passes this argument.
    if (!this.args.currentSortByValue) {
      return;
    } else {
      switch (this.args.value) {
        case SortByLabel.Newest:
          return { sortBy: SortByValue.DateDesc };
        case SortByLabel.Oldest:
          return { sortBy: SortByValue.DateAsc };
      }
    }
  }

  /**
   * Sets our local `element` reference to mouse target,
   * to capture its ID, which may change when the list is filtered.
   * Then, calls the parent component's `setFocusedItemIndex` action,
   * directing focus to the current element.
   */
  @action protected focusMouseTarget(e: MouseEvent) {
    let target = e.target;
    assert("target must be an element", target instanceof HTMLElement);
    this._domElement = target;
    this.args.setFocusedItemIndex(this.itemIndexNumber, false);
  }

  /**
   * Closes the dropdown on the next run loop.
   * Done so we don't interfere with Ember's <LinkTo> handling.
   */
  @action protected delayedCloseDropdown() {
    next(() => {
      this.args.hideDropdown();
    });
  }

  /**
   * The action called on element insertion. Sets the local `element`
   * reference to the domElement we know to be our target.
   */
  @action protected registerElement(element: HTMLElement) {
    this._domElement = element;
  }
}
