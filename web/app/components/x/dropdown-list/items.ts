import { assert } from "@ember/debug";
import { action } from "@ember/object";
import Component from "@glimmer/component";
import { FocusDirection } from ".";
import type { XDropdownListSharedArgs } from "./_shared";
import type { XDropdownListItemAPI, XDropdownListItemComponentArgs } from "./item";

interface XDropdownListItemsComponentSignature {
  Args: XDropdownListSharedArgs &
    XDropdownListItemComponentArgs & {
      contentID: string;
      query?: string;
      shownItems?: any;
      inputIsShown?: boolean;
      scrollContainer: HTMLElement;
      listIsShown?: boolean;
      keyboardNavIsEnabled?: boolean;
      onInput: (event: Event) => void;
      registerScrollContainer: (element: HTMLElement) => void;
    };
  Blocks: {
    default: [];
    "no-matches": [];
    item: [dd: XDropdownListItemAPI];
  };
}

export default class XDropdownListItemsComponent extends Component<XDropdownListItemsComponentSignature> {
  /**
   * The `aria-activedescendant` attribute of the list.
   * Used to indicate which item is currently focused.
   */
  protected get ariaActiveDescendant() {
    if (this.args.focusedItemIndex !== -1) {
      return `x-dropdown-list-item-${this.args.focusedItemIndex}`;
    }
  }
  /**
   * Whether the itemsList is shown. False if the component has explicitly
   * marked itself as hidden, or if there are no items to show.
   */
  protected get listIsShown(): boolean {
    if (this.args.listIsShown === false) {
      return false;
    } else {
      return (
        this.args.shownItems && Object.keys(this.args.shownItems).length > 0
      );
    }
  }

  /**
   * Whether there are any items to show. Determines if the
   * "no matches found" message should be shown.
   */
  protected get itemsAreShown(): boolean {
    if (this.args.shownItems === undefined) {
      return false;
    }

    return Object.entries(this.args.shownItems).length !== 0;
  }

  /**
   * Document keyboard listener for the ArrowUp/ArrowDown/Enter keys.
   * ArrowUp/ArrowDown change the focused item.
   * Enter selects the focused item.
   */
  @action protected maybeKeyboardNavigate(event: KeyboardEvent) {
    if (this.args.keyboardNavIsEnabled === false) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      this.args.setFocusedItemIndex(FocusDirection.Next);
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      this.args.setFocusedItemIndex(FocusDirection.Previous);
    }

    if (event.key === "Enter") {
      event.preventDefault();
      assert("floatingUI content must exist", this.args.scrollContainer);
      const target = this.args.scrollContainer.querySelector("[aria-selected]");

      if (
        target instanceof HTMLAnchorElement ||
        target instanceof HTMLButtonElement
      ) {
        target.click();
        this.args.hideContent();
      }
    }
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "X::DropdownList::Items": typeof XDropdownListItemsComponent;
  }
}
