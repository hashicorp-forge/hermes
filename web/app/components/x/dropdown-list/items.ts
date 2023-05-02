import { assert } from "@ember/debug";
import { action } from "@ember/object";
import Component from "@glimmer/component";
import { FocusDirection } from ".";

interface XDropdownListItemsComponentSignature {
  Args: {
    contentID: string;
    query?: string;
    items?: any;
    shownItems?: any;
    selected?: any;
    focusedItemIndex: number;
    inputIsShown?: boolean;
    listIsOrdered?: boolean;
    listItemRole: string;
    scrollContainer: HTMLElement;
    onInput: () => void;
    onItemClick: () => void;
    registerScrollContainer?: (e: HTMLElement) => void;
    setFocusedItemIndex: (direction: FocusDirection) => void;
    hideContent: () => void;
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
