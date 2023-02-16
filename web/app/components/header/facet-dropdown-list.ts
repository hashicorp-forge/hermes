import Component from "@glimmer/component";
import { FacetDropdownObjects } from "hermes/types/facets";
import { action } from "@ember/object";
import { tracked } from "@glimmer/tracking";
import { assert } from "@ember/debug";
import { restartableTask } from "ember-concurrency";
import { inject as service } from "@ember/service";
import RouterService from "@ember/routing/router-service";
import { schedule } from "@ember/runloop";

interface HeaderFacetDropdownListComponentSignature {
  Args: {
    label: string;
    facets: FacetDropdownObjects;
    menuItemFocusIndex: number;
  };
}

export enum FacetNames {
  DocType = "docType",
  Owners = "owners",
  Status = "status",
  Product = "product",
}

export enum FocusDirection {
  Previous = "previous",
  Next = "next",
}

export default class HeaderFacetDropdownListComponent extends Component<HeaderFacetDropdownListComponentSignature> {
  @service declare router: RouterService;

  @tracked private _popoverElement: HTMLDivElement | null = null;
  @tracked private _inputElement: HTMLInputElement | null = null;

  @tracked private query: string = "";

  @tracked protected menuItemFocusIndex = -1;
  @tracked protected shownFacets = this.args.facets;

  /**
   * The name of the current route.
   * Used to determine the component's LinkTo route.
   */
  protected get currentRouteName(): string {
    return this.router.currentRouteName;
  }

  /**
   * TODO
   */
  private get popoverElement(): HTMLDivElement {
    assert("_popoverElement must exist", this._popoverElement);
    return this._popoverElement;
  }

  /**
   * The input element.
   * Receives focus when the user presses the up arrow key
   * while the first menu item is focused.
   */
  private get inputElement(): HTMLInputElement {
    assert("_inputElement must exist", this._inputElement);
    return this._inputElement;
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
  protected get noMatchesFound(): boolean {
    return Object.entries(this.shownFacets).length === 0;
  }

  /**
   * The code-friendly name of the facet.
   * Used to apply width styles to the dropdown.
   */
  protected get facetName(): FacetNames | undefined {
    switch (this.args.label) {
      case "Type":
        return FacetNames.DocType;
      case "Status":
        return FacetNames.Status;
      case "Product/Area":
        return FacetNames.Product;
      case "Owner":
        return FacetNames.Owners;
    }
  }
  @tracked protected menuItems: NodeListOf<Element> | null = null;

  @action registerMenuItems(items: NodeListOf<Element>): void {
    this.menuItems = items;
    for (let i = 0; i < items.length; i++) {
      let item = items[i];
      assert("item must exist", item instanceof HTMLElement);
      item.id = `facet-dropdown-menu-item-${i}`;
    }
  }

  /**
   * Registers the popover element.
   * Used to determine the focusable elements in the dropdown.
   */
  @action protected registerPopover(element: HTMLDivElement) {
    this._popoverElement = element;
    this.registerMenuItems(
      this.popoverElement.querySelectorAll("[role=option]")
    );
  }

  /**
   * Registers the input element.
   * Used to assert that the element exists and can be focused.
   */
  @action protected registerInput(element: HTMLInputElement) {
    this._inputElement = element;

    schedule("afterRender", () => {
      this.inputElement.focus();
    });
  }

  /**
   * Sets the focus to the next or previous menu item.
   * Used by the onKeydown action to navigate the dropdown.
   */
  @action protected setFocusTo(focusDirection: FocusDirection | number) {
    if (!this.menuItems) {
      return;
    }

    if (this.menuItems.length === 0) {
      return;
    }

    if (focusDirection === FocusDirection.Next) {
      if (this.menuItemFocusIndex === this.menuItems.length - 1) {
        // When the last item is focused, "next" focuses the first item.
        this.menuItemFocusIndex = 0;
      } else {
        // Otherwise it focuses the next item.
        this.menuItemFocusIndex++;
      }
    }

    if (focusDirection === FocusDirection.Previous) {
      if (this.menuItemFocusIndex === 0) {
        // When the first item is focused, "previous" focuses the last item.
        this.menuItemFocusIndex = this.menuItems.length - 1;
      } else {
        // In all other cases, it focuses the previous item.
        this.menuItemFocusIndex--;
      }
    }

    if (typeof focusDirection === "number") {
      this.menuItemFocusIndex = focusDirection;
    }

    // (menuItems[this.menuItemFocusIndex] as HTMLElement).focus();
  }

  /**
   * The action run when the user presses a key.
   * Handles the arrow keys to navigate the dropdown.
   */
  @action protected onKeydown(event: KeyboardEvent) {
    console.log(this.menuItemFocusIndex);
    this.registerMenuItems(
      this.popoverElement.querySelectorAll("[role=option]")
    );

    if (event.key === "ArrowDown") {
      event.preventDefault();
      this.setFocusTo(FocusDirection.Next);
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      this.setFocusTo(FocusDirection.Previous);
    }
  }

  /**
   * Resets the focus index to its initial value.
   * Called when the dropdown is closed, and when the input is focused.
   */
  @action protected resetMenuItemIndex() {
    this.menuItemFocusIndex = -1;
  }

  /**
   * The action run when the user types in the input.
   * Filters the facets shown in the dropdown.
   */
  protected onInput = restartableTask(async (inputEvent: InputEvent) => {
    let shownFacets: FacetDropdownObjects = {};
    let facets = this.args.facets;
    this.query = (inputEvent.target as HTMLInputElement).value;
    for (const [key, value] of Object.entries(facets)) {
      if (key.toLowerCase().includes(this.query.toLowerCase())) {
        shownFacets[key] = value;
      }
    }
    this.shownFacets = shownFacets;
    this.menuItemFocusIndex = -1;
    // schedule("afterRender", () => {
    //   this.registerMenuItems(
    //     this.popoverElement.querySelectorAll("[role=option]")
    //   );
    // });
  });
}
