import { assert } from "@ember/debug";
import { action } from "@ember/object";
import { schedule } from "@ember/runloop";
import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { restartableTask, task } from "ember-concurrency";
import FetchService from "hermes/services/fetch";

interface XHdsDropdownComponentSignature<T> {
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

export default class XHdsDropdownComponent extends Component<
  XHdsDropdownComponentSignature<any>
> {
  @service("fetch") declare fetchSvc: FetchService;

  @tracked _trigger: HTMLElement | null = null;
  @tracked private _scrollContainer: HTMLElement | null = null;

  @tracked protected focusedItemIndex = -1;

  @tracked filteredItems: unknown | null = null;
  @tracked protected menuItems: NodeListOf<Element> | null = null;

  private get scrollContainer(): HTMLElement {
    assert("_scrollContainer must exist", this._scrollContainer);
    return this._scrollContainer;
  }

  get shownItems() {
    console.log(this.args.items);
    return this.filteredItems || this.args.items;
  }

  @action protected registerScrollContainer(element: HTMLDivElement) {
    this._scrollContainer = element;
  }

  @action willDestroyDropdown() {
    this.filteredItems = null;
  }

  @action onSelect(product: string, hideDropdown: () => void) {
    this.args.onChange(product);
    hideDropdown();
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

  @action protected onTriggerKeydown(event: KeyboardEvent, f: any) {
    if (f.contentIsShown) {
      return;
    }

    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      f.hideDropdown();

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

  protected onInput = restartableTask(
    async (inputEvent: InputEvent, f: any) => {
      this.focusedItemIndex = -1;

      // TODO: type the API interface

      // need some handling whether it's an object or an array

      // let shownFacets: FacetDropdownObjects = {};
      // let facets = this.args.facets;

      // this.query = (inputEvent.target as HTMLInputElement).value;
      // for (const [key, value] of Object.entries(facets)) {
      //   if (key.toLowerCase().includes(this.query.toLowerCase())) {
      //     shownFacets[key] = value;
      //   }
      // }

      // this.filteredItems = shownFacets;

      // schedule("afterRender", () => {
      //   this.assignMenuItemIDs(
      //     f.content.querySelectorAll(`[role=${this.listItemRole}]`)
      //   );
      // });
    }
  );
}
