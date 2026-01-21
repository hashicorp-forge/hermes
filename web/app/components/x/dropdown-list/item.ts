import { assert } from "@ember/debug";
import { action } from "@ember/object";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { next, schedule } from "@ember/runloop";
import { isTesting } from "@embroider/macros";
import { WithBoundArgs } from "@glint/template";
import XDropdownListActionComponent from "./action";
import XDropdownListLinkToComponent from "./link-to";
import { restartableTask, timeout } from "ember-concurrency";
import { FocusDirection } from ".";
import XDropdownListExternalLinkComponent from "./external-link";

type XDropdownListInteractiveComponentBoundArgs =
  | "role"
  | "isAriaSelected"
  | "isAriaChecked"
  | "registerElement"
  | "focusMouseTarget"
  | "onClick";

export interface XDropdownListItemAPI {
  Action: WithBoundArgs<
    typeof XDropdownListActionComponent,
    XDropdownListInteractiveComponentBoundArgs
  >;
  LinkTo: WithBoundArgs<
    typeof XDropdownListLinkToComponent,
    XDropdownListInteractiveComponentBoundArgs
  >;
  ExternalLink: WithBoundArgs<
    typeof XDropdownListExternalLinkComponent,
    XDropdownListInteractiveComponentBoundArgs
  >;
  contentID: string;
  value: any;
  selected?: any;
  isSelected?: boolean;
  attrs?: any;
}

export interface XDropdownListItemComponentArgs {
  contentID: string;
  attributes?: any;
  isSelected?: boolean;
  focusedItemIndex: number;
  listItemRole: string;
  onItemClick?: (value: any, attributes: any) => void;
  setFocusedItemIndex: (
    focusDirection: FocusDirection | number,
    scrollIntoView?: boolean,
  ) => void;
  hideContent: () => void;
}

interface XDropdownListItemComponentSignature {
  Args: XDropdownListItemComponentArgs & {
    value: string;
    selected?: any;
  };
  Blocks: {
    default: [dd: XDropdownListItemAPI];
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
  private get itemIndexNumber(): number | null {
    let idNumber = this.domElementID.split("-").pop();
    if (idNumber) {
      return parseInt(idNumber, 10);
    } else {
      return null;
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

  /**
   * The action called on clicked. Runs the parent component's
   * `onItemClick` action, if it exists, and hides the dropdown.
   * The "link-to" sub-component runs this on the next run loop
   * to avoid interfering with Ember's <LinkTo> handling.
   */
  @action onClick() {
    if (this.args.onItemClick) {
      this.args.onItemClick(this.args.value, this.args.attributes);
    }

    this.args.hideContent();
  }

  /**
   * The task run when the mouse enters the element.
   * If menuItemIDs have been assigned, sets our local `element`
   * reference to the mouse target and aria-focuses it.
   *
   * Depending on the component, MenuItemIDs are sometimes assigned
   * in the next run loop, which means they're not always available on mouseenter.
   * For example, if a cursor hovers a menu item and the list is filtered,
   * the mouseenter event will fire before the ID is assigned.
   *
   * In these cases, we wait a tick and try again (up to 3 times).
   */
  protected maybeFocusMouseTarget = restartableTask(async (e: MouseEvent) => {
    for (let i = 0; i <= 3; i++) {
      if (this.itemIndexNumber !== null) {
        let target = e.target;
        assert("target must be an element", target instanceof HTMLElement);
        this._domElement = target;
        this.args.setFocusedItemIndex(this.itemIndexNumber, false);
        return;
      } else {
        if (i === 3) {
          throw new Error("itemIndexNumber can not be undefined");
        } else {
          await timeout(1);
        }
      }
    }
  });
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "X::DropdownList::Item": typeof XDropdownListItemComponent;
  }
}
