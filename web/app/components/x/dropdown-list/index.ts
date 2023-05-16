import { assert } from "@ember/debug";
import { action } from "@ember/object";
import { schedule } from "@ember/runloop";
import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { restartableTask } from "ember-concurrency";
import FetchService from "hermes/services/fetch";

interface XDropdownListComponentSignature<T> {
  Args: {
    selected: any;
    items?: any;
    onChange: (value: any) => void;
    listIsOrdered?: boolean;
  };
}

export enum FocusDirection {
  Previous = "previous",
  Next = "next",
  First = "first",
  Last = "last",
}

export default class XDropdownListComponent extends Component<
  XDropdownListComponentSignature<any>
> {
  @service("fetch") declare fetchSvc: FetchService;

  @tracked private _scrollContainer: HTMLElement | null = null;
  @tracked private _input: HTMLInputElement | null = null;
  @tracked private _filteredItems: unknown | null = null;
  @tracked private _menuItems: NodeListOf<Element> | null = null;

  @tracked protected query: string = "";
  @tracked protected listItemRole = this.inputIsShown ? "option" : "menuitem";
  @tracked protected focusedItemIndex = -1;

  /**
   * An asserted-true reference to the scroll container.
   */
  private get scrollContainer(): HTMLElement {
    assert("_scrollContainer must exist", this._scrollContainer);
    return this._scrollContainer;
  }

  /**
   * An asserted-true reference to the filter input.
   */
  get input() {
    assert("input must exist", this._input);
    return this._input;
  }

  /**
   * Whether the dropdown has a filter input.
   * Used to determine layout configurations and
   * aria-roles for various elements.
   */
  get inputIsShown() {
    if (!this.args.items) {
      return false;
    } else {
      return Object.keys(this.args.items).length > 7;
    }
  }

  /**
   * The items that should be shown in the dropdown.
   * Initially the same as the items passed in and
   * updated when the user types in the filter input.
   */
  get shownItems() {
    return this._filteredItems || this.args.items;
  }

  /**
   * The action run when the scrollContainer is inserted.
   * Registers the div for reference locally.
   */
  @action protected registerScrollContainer(element: HTMLDivElement) {
    this._scrollContainer = element;
  }

  /**
   * The action performed when the filter input is inserted.
   * Registers the input locally and focuses it for the user.
   */
  @action registerAndFocusInput(e: HTMLInputElement) {
    this._input = e;

    /**
     * The dropdown is initially positioned in the top of page-body,
     * so we specify that the focus event should not scroll to it.
     * Instead, we use FloatingUI to place the input in view.
     */
    this.input.focus({ preventScroll: true });
  }

  /**
   * The action run when the content div is inserted.
   * Used to assign ids to the menu items.
   */
  @action protected didInsertContent() {
    assert(
      "didInsertContent expects a _scrollContainer",
      this._scrollContainer
    );
    this.assignMenuItemIDs(
      this._scrollContainer.querySelectorAll(`[role=${this.listItemRole}]`)
    );
  }

  @action onDestroy() {
    this.query = "";
    this._filteredItems = null;
    this.focusedItemIndex = -1;
  }

  /**
   * The action run when the content div is destroyed.
   * Resets the filtered items so that the next time the
   * popover is opened, the full list of items is shown.
   */
  @action resetFilteredItems() {
    this._filteredItems = null;
  }

  /**
   * The action run when the popover is inserted, and when
   * the user filters or navigates the dropdown.
   * Loops through the menu items and assigns an id that
   * matches the index of the item in the list.
   */
  @action assignMenuItemIDs(items: NodeListOf<Element>): void {
    this._menuItems = items;
    for (let i = 0; i < items.length; i++) {
      let item = items[i];
      assert("item must exist", item instanceof HTMLElement);
      item.id = `x-dropdown-list-item-${i}`;
    }
  }

  /**
   * The action run when the trigger is focused and the user
   * presses the up or down arrow keys. Used to open and focus
   * to the first or last item in the dropdown.
   */
  @action protected onTriggerKeydown(
    contentIsShown: boolean,
    showContent: () => void,
    event: KeyboardEvent
  ) {
    if (contentIsShown) {
      return;
    }

    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      showContent();

      // Prevent the event from bubbling to the contentBody's keydown listener.
      event.stopPropagation();

      // Wait for menuItemIDs to be set by `didInsertContent`.
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
    let { _menuItems: menuItems, focusedItemIndex } = this;

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
    const focusedItem = this._menuItems?.item(this.focusedItemIndex);
    assert("focusedItem must exist", focusedItem instanceof HTMLElement);

    const containerHeight = this.scrollContainer.offsetHeight;
    const itemHeight = focusedItem.offsetHeight;
    const itemTop = focusedItem.offsetTop;
    const itemBottom = focusedItem.offsetTop + itemHeight;
    const scrollviewTop = this.scrollContainer.scrollTop;
    const scrollviewBottom = scrollviewTop + containerHeight;

    if (itemBottom > scrollviewBottom) {
      this.scrollContainer.scrollTop = itemTop + itemHeight - containerHeight;
    } else if (itemTop < scrollviewTop) {
      this.scrollContainer.scrollTop = itemTop;
    }
  }
  /**
   * The action run when the user types in the input.
   * Filters the facets shown in the dropdown and schedules
   * the menu items to be assigned their new IDs.
   */
  protected onInput = restartableTask(async (inputEvent: InputEvent) => {
    this.focusedItemIndex = -1;

    let shownItems: any = {};
    let { items } = this.args;

    this.query = (inputEvent.target as HTMLInputElement).value;
    for (const [key, value] of Object.entries(items)) {
      if (key.toLowerCase().includes(this.query.toLowerCase())) {
        shownItems[key] = value;
      }
    }

    this._filteredItems = shownItems;

    schedule("afterRender", () => {
      assert("onInput expects a _scrollContainer", this._scrollContainer);
      this.assignMenuItemIDs(
        this._scrollContainer.querySelectorAll(`[role=${this.listItemRole}]`)
      );
    });
  });
}
