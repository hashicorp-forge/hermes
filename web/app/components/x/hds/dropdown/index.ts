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
    items: any;
    onChange: (value: any) => void;
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
  @tracked _items: unknown | undefined = undefined;
  @tracked private _scrollContainer: HTMLElement | null = null;

  @tracked protected focusedItemIndex = -1;

  @tracked filteredItems: unknown | null = null;

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

  get shownItems() {
    return this.filteredItems || this.items;
  }

  get items() {
    assert("products must exist", this._items);
    return this._items;
  }

  @action willDestroyDropdown() {
    this.filteredItems = null;
  }

  @action onSelect(product: string, hideDropdown: () => void) {
    this.args.onChange(product);
    hideDropdown();
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
