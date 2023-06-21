import { assert } from "@ember/debug";
import { action } from "@ember/object";
import Component from "@glimmer/component";
import { FocusDirection, XDropdownListSharedArgs } from ".";
import { XDropdownListItemAPI, XDropdownListItemSharedArgs } from "./item";

interface XDropdownListItemsComponentSignature {
  Args: XDropdownListSharedArgs &
    XDropdownListItemSharedArgs & {
      contentID: string;
      query?: string;
      shownItems?: any;
      inputIsShown?: boolean;
      scrollContainer: HTMLElement;
      onInput: (event: Event) => void;
      registerScrollContainer: (element: HTMLElement) => void;
    };
  Blocks: {
    item: [dd: XDropdownListItemAPI];
  };
}

export default class XDropdownListItemsComponent extends Component<XDropdownListItemsComponentSignature> {
  /**
   * The `aria-activedescendant` attribute of the list.
   * Used to indicate which item is currently focused.
   */
  get ariaActiveDescendant() {
    if (this.args.focusedItemIndex !== -1) {
      return `x-dropdown-list-item-${this.args.focusedItemIndex}`;
    }
  }

  /**
   * Whether the "no matches found" message should be shown.
   * True if the input is shown and there are no items to show.
   */
  protected get noMatchesFound(): boolean {
    if (!this.args.inputIsShown) {
      return false;
    }
    return Object.entries(this.args.shownItems).length === 0;
  }
  /**
   * Keyboard listener for the ArrowUp/ArrowDown/Enter keys.
   * ArrowUp/ArrowDown change the focused item.
   * Enter selects the focused item.
   */
  @action protected maybeKeyboardNavigate(event: KeyboardEvent) {
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
