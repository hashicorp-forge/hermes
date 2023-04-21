import { assert } from "@ember/debug";
import { action } from "@ember/object";
import { next, schedule } from "@ember/runloop";
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

  @tracked _trigger: HTMLElement | null = null;
  @tracked private _scrollContainer: HTMLElement | null = null;
  @tracked protected query: string = "";

  @tracked protected listItemRole = this.inputIsShown ? "option" : "menuitem";

  @tracked protected focusedItemIndex = -1;

  @tracked filteredItems: unknown | null = null;
  @tracked protected menuItems: NodeListOf<Element> | null = null;

  @tracked _input: HTMLInputElement | null = null;

  private get scrollContainer(): HTMLElement {
    assert("_scrollContainer must exist", this._scrollContainer);
    return this._scrollContainer;
  }

  get input() {
    assert("input must exist", this._input);
    return this._input;
  }

  get inputIsShown() {
    if (!this.args.items) {
      return false;
    } else {
      return Object.keys(this.args.items).length > 7;
    }
  }

  get shownItems() {
    return this.filteredItems || this.args.items;
  }

  get ariaControls() {
    let value = "x-dropdown-";
    if (this.inputIsShown) {
      value += "popover";
    } else {
      value += "list";
    }

    return `${value}-`;
  }

  @action protected registerScrollContainer(element: HTMLDivElement) {
    this._scrollContainer = element;
  }

  @action registerAndFocusInput(e: HTMLInputElement) {
    this._input = e;
    this.input.focus();
  }

  @action protected didInsertList() {
    schedule("afterRender", () => {
      assert("didInsertList expects a _scrollContainer", this._scrollContainer);
      this.assignMenuItemIDs(
        this._scrollContainer.querySelectorAll(`[role=${this.listItemRole}]`)
      );
    });
  }

  @action willDestroyDropdown() {
    this.filteredItems = null;
  }

  @action assignMenuItemIDs(items: NodeListOf<Element>): void {
    this.menuItems = items;
    for (let i = 0; i < items.length; i++) {
      let item = items[i];
      assert("item must exist", item instanceof HTMLElement);
      item.id = `facet-dropdown-menu-item-${i}`;
    }
  }

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

  @action protected resetFocusedItemIndex() {
    this.focusedItemIndex = -1;
  }

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

  @action protected onTriggerKeydown(
    contentIsShown: boolean,
    showContent: () => void,
    event: KeyboardEvent
  ) {
    if (contentIsShown) {
      return;
    }

    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      // Stop the event from bubbling to the popover's keydown handler.
      event.preventDefault();

      showContent();

      // Wait for the menuItems to be set by the showDropdown action.
      next(() => {
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

  protected onInput = restartableTask(
    async (content: HTMLElement | null, inputEvent: InputEvent) => {
      this.focusedItemIndex = -1;

      let showItems: any = {};
      let { items } = this.args;

      this.query = (inputEvent.target as HTMLInputElement).value;
      for (const [key, value] of Object.entries(items)) {
        if (key.toLowerCase().includes(this.query.toLowerCase())) {
          showItems[key] = value;
        }
      }

      this.filteredItems = showItems;

      schedule("afterRender", () => {
        assert("onInput expects floatingUI content", content);
        this.assignMenuItemIDs(
          content.querySelectorAll(`[role=${this.listItemRole}]`)
        );
      });
    }
  );
}
