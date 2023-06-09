import { assert } from "@ember/debug";
import { action } from "@ember/object";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { FocusDirection } from ".";
import { next, schedule } from "@ember/runloop";
import Ember from "ember";
import { restartableTask, timeout } from "ember-concurrency";

interface XDropdownListItemComponentSignature {
  Args: {
    value: string;
    attributes?: unknown;
    selected: boolean;
    focusedItemIndex: number;
    listItemRole: string;
    hideDropdown: () => void;
    onItemClick?: (value: any, attributes: any) => void;
    setFocusedItemIndex: (
      focusDirection: FocusDirection | number,
      maybeScrollIntoView?: boolean
    ) => void;
  };
}

export default class XDropdownListItemComponent extends Component<XDropdownListItemComponentSignature> {
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
   * A numeric identifier for the element based on its id,
   * as computed by the parent component on render and when
   * the FacetList is filtered. Strips everything but the trailing number.
   * Used to apply classes and aria-selected, and to direct the parent component's
   * focus action toward the correct element.
   */
  private get itemIndexNumber(): number | undefined {
    let idNumber = this.domElementID.split("-").pop();
    if (idNumber) {
      return parseInt(idNumber, 10);
    } else {
      return undefined;
    }
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
      this.args.onItemClick(this.args.value, this.args.attributes);
    }

    /**
     * In production, close the dropdown on the next run loop
     * so that we don't interfere with Ember's <LinkTo> handling.
     * This approach causes issues when testing, so we
     * use `schedule` as an approximation.
     *
     * TODO: Improve this.
     */
    if (Ember.testing) {
      schedule("afterRender", () => {
        this.args.hideDropdown();
      });
    } else {
      next(() => {
        this.args.hideDropdown();
      });
    }
  }

  /**
   * The action run when the mouse enters the element.
   * If menuItemIDs have been assigned, sets our local `element`
   * reference to the mouse target and calls aria-focuses it.
   *
   * For component-specific reasons, MenuItemIDs are sometimes assigned
   * in the next run loop. This means they're not always available on mouseenter.
   * For example, if a cursor is hovering a menu item and the list is filtered,
   * the mouseenter event will fire before the ID is assigned.
   *
   * In these cases, we retry up to three more times.
   */
  protected maybeFocusMouseTarget = restartableTask(async (e: MouseEvent) => {
    for (let i = 0; i <= 3; i++) {
      if (this.itemIndexNumber !== undefined) {
        let target = e.target;
        assert("target must be an element", target instanceof HTMLElement);
        this._domElement = target;
        this.args.setFocusedItemIndex(this.itemIndexNumber, false);
        return;
      } else {
        await timeout(1);
      }
    }
  });
}
