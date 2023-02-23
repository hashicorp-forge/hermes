import Component from "@glimmer/component";
import { action } from "@ember/object";
import { FacetDropdownObjects } from "hermes/types/facets";
import { tracked } from "@glimmer/tracking";
import { assert } from "@ember/debug";
import { restartableTask } from "ember-concurrency";
import { schedule } from "@ember/runloop";

interface FacetDropdownComponentSignature {
  Args: {
    label: string;
    facets: FacetDropdownObjects;
    disabled?: boolean;
  };
}

export enum FocusDirection {
  Previous = "previous",
  Next = "next",
  First = "first",
  Last = "last",
}

export default class FacetDropdownComponent extends Component<FacetDropdownComponentSignature> {
  @tracked private _triggerElement: HTMLButtonElement | null = null;
  @tracked private _scrollContainer: HTMLElement | null = null;
  @tracked private _popoverElement: HTMLDivElement | null = null;

  @tracked protected query: string = "";
  @tracked protected listItemRole = this.inputIsShown ? "option" : "menuitem";
  @tracked protected dropdownIsShown = false;
  @tracked protected focusedItemIndex = -1;
  @tracked protected _shownFacets: FacetDropdownObjects | null = null;

  /**
   * The dropdown menu items. Registered on insert and
   * updated with on keydown and filterInput events.
   * Used to determine the list length, and to find the focused
   * element by index.
   */
  @tracked protected menuItems: NodeListOf<Element> | null = null;

  /**
   * An asserted-true reference to the scroll container.
   * Used in the `maybeScrollIntoView` calculations.
   */
  private get scrollContainer(): HTMLElement {
    assert("_scrollContainer must exist", this._scrollContainer);
    return this._scrollContainer;
  }

  /**
   * An asserted-true reference to the popover div.
   * Used to scope querySelectorAll calls.
   */
  private get popoverElement(): HTMLDivElement {
    assert("_popoverElement must exist", this._popoverElement);
    return this._popoverElement;
  }

  /**
   * The dropdown trigger.
   * Passed to the dismissible modifier as a dropdown relative.
   */
  protected get triggerElement(): HTMLButtonElement {
    assert("_triggerElement must exist", this._triggerElement);
    return this._triggerElement;
  }

  /**
   * The facets that should be shown in the dropdown.
   * Initially the same as the facets passed in and
   * updated when the user types in the filter input.
   */
  protected get shownFacets(): FacetDropdownObjects {
    if (this._shownFacets) {
      return this._shownFacets;
    } else {
      return this.args.facets;
    }
  }

  /**
   * Whether the filter input should be shown.
   * True when the input has more facets than
   * can be shown in the dropdown (12).
   */
  protected get inputIsShown() {
    return Object.entries(this.args.facets).length > 12;
  }

  @action protected registerTrigger(element: HTMLButtonElement) {
    this._triggerElement = element;
  }

  @action protected registerPopover(element: HTMLDivElement) {
    this._popoverElement = element;
    this.assignMenuItemIDs(
      this.popoverElement.querySelectorAll(`[role=${this.listItemRole}]`)
    );
  }

  @action protected registerScrollContainer(element: HTMLDivElement) {
    this._scrollContainer = element;
  }

  /**
   * The action run when the popover is inserted, and when
   * the user filters or navigates the dropdown.
   * Loops through the menu items and assigns an id that
   * matches the index of the item in the list.
   */
  @action assignMenuItemIDs(items: NodeListOf<Element>): void {
    this.menuItems = items;
    for (let i = 0; i < items.length; i++) {
      let item = items[i];
      assert("item must exist", item instanceof HTMLElement);
      item.id = `facet-dropdown-menu-item-${i}`;
    }
  }

  /**
   * The action run when the user presses a key.
   * Handles the arrow keys to navigate the dropdown.
   */
  @action protected onKeydown(event: KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      this.setFocusedItemIndex(FocusDirection.Next);
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      this.setFocusedItemIndex(FocusDirection.Previous);
    }
  }

  /**
   * Toggles the dropdown visibility.
   * Called when the user clicks on the dropdown trigger.
   */
  @action protected toggleDropdown(): void {
    if (this.dropdownIsShown) {
      this.hideDropdown();
    } else {
      this.showDropdown();
    }
  }

  @action protected showDropdown(): void {
    this.dropdownIsShown = true;
    schedule("afterRender", () => {
      this.assignMenuItemIDs(
        this.popoverElement.querySelectorAll(`[role=${this.listItemRole}]`)
      );
    });
  }

  /**
   * The action run when the user clicks outside the dropdown.
   * Hides the dropdown and resets the various tracked states.
   */
  @action protected hideDropdown(): void {
    this.query = "";
    this.dropdownIsShown = false;
    this._shownFacets = null;
    this.resetFocusedItemIndex();
  }

  /**
   * The action run when the trigger is focused and the user
   * presses the up or down arrow keys. Used to open and focus
   * to the first or last item in the dropdown.
   */
  @action protected onTriggerKeydown(event: KeyboardEvent) {
    if (this.dropdownIsShown) {
      return;
    }

    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      this.showDropdown();

      // Stop the event from bubbling to the popover's keydown handler.
      event.stopPropagation();

      // Wait for the menuItems to be set by the showDropdown action.
      schedule("afterRender", () => {
        switch (event.key) {
          case "ArrowDown":
            this.setFocusedItemIndex(FocusDirection.First, false);
            break;
          case "ArrowUp":
            this.setFocusedItemIndex(FocusDirection.Last);
            break;
        }
      });
    }
  }

  /**
   * Sets the focus to the next or previous menu item.
   * Used by the onKeydown action to navigate the dropdown, and
   * by the FacetDropdownListItem component on mouseenter.s
   */
  @action protected setFocusedItemIndex(
    focusDirectionOrNumber: FocusDirection | number,
    maybeScrollIntoView = true
  ) {
    let { menuItems, focusedItemIndex } = this;

    let setFirst = () => {
      focusedItemIndex = 0;
    };

    let setLast = () => {
      assert("menuItems must exist", menuItems);
      focusedItemIndex = menuItems.length - 1;
    };

    if (!menuItems) {
      return;
    }

    if (menuItems.length === 0) {
      return;
    }

    switch (focusDirectionOrNumber) {
      case FocusDirection.Previous:
        if (focusedItemIndex === -1 || focusedItemIndex === 0) {
          // When the first or no item is focused, "previous" focuses the last item.
          setLast();
        } else {
          focusedItemIndex--;
        }
        break;
      case FocusDirection.Next:
        if (focusedItemIndex === menuItems.length - 1) {
          // When the last item is focused, "next" focuses the first item.
          setFirst();
        } else {
          focusedItemIndex++;
        }
        break;
      case FocusDirection.First:
        setFirst();
        break;
      case FocusDirection.Last:
        setLast();
        break;
      default:
        focusedItemIndex = focusDirectionOrNumber;
        break;
    }

    this.focusedItemIndex = focusedItemIndex;

    if (maybeScrollIntoView) {
      this.maybeScrollIntoView();
    }
  }

  /**
   * Checks whether the focused item is completely visible,
   * and, if necessary, scrolls the dropdown to make it visible.
   * Used by the setFocusedItemIndex action on keydown.
   */
  private maybeScrollIntoView() {
    const focusedItem = this.menuItems?.item(this.focusedItemIndex);
    assert("focusedItem must exist", focusedItem instanceof HTMLElement);

    const containerTopPadding = 12;
    const containerHeight = this.scrollContainer.offsetHeight;
    const itemHeight = focusedItem.offsetHeight;
    const itemTop = focusedItem.offsetTop;
    const itemBottom = focusedItem.offsetTop + itemHeight;
    const scrollviewTop = this.scrollContainer.scrollTop - containerTopPadding;
    const scrollviewBottom = scrollviewTop + containerHeight;

    if (itemBottom > scrollviewBottom) {
      this.scrollContainer.scrollTop = itemTop + itemHeight - containerHeight;
    } else if (itemTop < scrollviewTop) {
      this.scrollContainer.scrollTop = itemTop;
    }
  }

  /**
   * Resets the focus index to its initial value.
   * Called when the dropdown is closed, and when the input is focused.
   */
  @action protected resetFocusedItemIndex() {
    this.focusedItemIndex = -1;
  }

  /**
   * The action run when the user types in the input.
   * Filters the facets shown in the dropdown and schedules
   * the menu items to be assigned their new IDs.
   */
  protected onInput = restartableTask(async (inputEvent: InputEvent) => {
    this.focusedItemIndex = -1;

    let shownFacets: FacetDropdownObjects = {};
    let facets = this.args.facets;

    this.query = (inputEvent.target as HTMLInputElement).value;
    for (const [key, value] of Object.entries(facets)) {
      if (key.toLowerCase().includes(this.query.toLowerCase())) {
        shownFacets[key] = value;
      }
    }

    this._shownFacets = shownFacets;

    schedule("afterRender", () => {
      this.assignMenuItemIDs(
        this.popoverElement.querySelectorAll(`[role=${this.listItemRole}]`)
      );
    });
  });
}
