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
  @tracked protected shownFacets = this.args.facets;

  /**
   * TODO
   */
  @tracked protected menuItems: NodeListOf<Element> | null = null;

  /**
   * The dropdown trigger.
   * Passed to the dismissible modifier as a dropdown relative.
   */
  protected get triggerElement(): HTMLButtonElement {
    assert("_triggerElement must exist", this._triggerElement);
    return this._triggerElement;
  }

  /**
   * TODO
   */
  private get scrollContainer(): HTMLElement {
    assert("_scrollContainer must exist", this._scrollContainer);
    return this._scrollContainer;
  }

  /**
   * Whether the filter input should be shown.
   * True when the input has more facets than
   * can be shown in the dropdown (12).
   */
  protected get inputIsShown() {
    return Object.entries(this.args.facets).length > 12;
  }

  /**
   * TODO
   */
  private get popoverElement(): HTMLDivElement {
    assert("_popoverElement must exist", this._popoverElement);
    return this._popoverElement;
  }

  /**
   * Registers the trigger element.
   * Used to pass the trigger to the dismissible modifier as a relative.
   */
  @action protected registerTrigger(element: HTMLButtonElement) {
    this._triggerElement = element;
  }

  /**
   * Registers the popover element.
   * Used to determine the focusable elements in the dropdown.
   */
  @action protected registerPopover(element: HTMLDivElement) {
    this._popoverElement = element;
    this.registerMenuItems(
      this.popoverElement.querySelectorAll(`[role=${this.listItemRole}]`)
    );
  }

  /**
   * TODO
   */
  @action registerScrollContainer(element: HTMLDivElement) {
    this._scrollContainer = element;
  }

  /**
   * The action run when the user presses a key.
   * Handles the arrow keys to navigate the dropdown.
   */
  @action protected onKeydown(event: KeyboardEvent) {
    this.registerMenuItems(
      this.popoverElement.querySelectorAll(`[role=${this.listItemRole}]`)
    );

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
   * TODO
   */
  @action registerMenuItems(items: NodeListOf<Element>): void {
    this.menuItems = items;
    for (let i = 0; i < items.length; i++) {
      let item = items[i];
      assert("item must exist", item instanceof HTMLElement);
      item.id = `facet-dropdown-menu-item-${i}`;
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
      this.dropdownIsShown = true;
    }
  }

  /**
   * The action run when the user clicks outside the dropdown.
   * Hides the dropdown.
   */
  @action protected hideDropdown(): void {
    this.dropdownIsShown = false;
  }

  @action protected onButtonKeydown(event: KeyboardEvent) {
    if (this.dropdownIsShown) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      this.dropdownIsShown = true;
      this.setFocusedItemIndex(FocusDirection.First, false);
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      this.dropdownIsShown = true;
      this.setFocusedItemIndex(FocusDirection.Last);
    }
  }

  /**
   * Sets the focus to the next or previous menu item.
   * Used by the onKeydown action to navigate the dropdown.
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

  maybeScrollIntoView() {
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
  @action protected resetMenuItemIndex() {
    this.focusedItemIndex = -1;
  }

  /**
   * The action run when the user types in the input.
   * Filters the facets shown in the dropdown.
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
    this.shownFacets = shownFacets;

    schedule("afterRender", () => {
      this.registerMenuItems(
        this.popoverElement.querySelectorAll(`[role=${this.listItemRole}]`)
      );
    });
  });
}
