import Component from "@glimmer/component";
import { FacetDropdownObjects } from "hermes/types/facets";
import { action } from "@ember/object";
import { tracked } from "@glimmer/tracking";
import { assert } from "@ember/debug";
import { inject as service } from "@ember/service";
import RouterService from "@ember/routing/router-service";
import { schedule } from "@ember/runloop";
import { FocusDirection } from "./facet-dropdown";

interface HeaderFacetDropdownListComponentSignature {
  Args: {
    inputIsShown: boolean;
    label: string;
    shownFacets: FacetDropdownObjects;
    popoverElement: HTMLDivElement | null;
    listItemRole: "option" | "menuitem";
    registerMenuItems: (menuItems: NodeListOf<Element>) => void;
    resetMenuItemIndex: () => void;
    onInput: (event: InputEvent) => void;
    registerPopover: (element: HTMLDivElement) => void;
    setFocusedItemIndex: (direction: FocusDirection) => void;
    triggerElement: HTMLButtonElement;
  };
}

export enum FacetNames {
  DocType = "docType",
  Owners = "owners",
  Status = "status",
  Product = "product",
}

export default class HeaderFacetDropdownListComponent extends Component<HeaderFacetDropdownListComponentSignature> {
  @service declare router: RouterService;

  @tracked private _inputElement: HTMLInputElement | null = null;

  /**
   * The name of the current route.
   * Used to determine the component's LinkTo route.
   */
  protected get currentRouteName(): string {
    return this.router.currentRouteName;
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
   * TODO
   */
  protected get noMatchesFound(): boolean {
    return Object.entries(this.args.shownFacets).length === 0;
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
   * The action run when the user presses a key.
   * Handles the arrow keys to navigate the dropdown.
   */
  @action protected onKeydown(event: KeyboardEvent) {
    assert("popoverElement must exist", this.args.popoverElement);

    this.args.registerMenuItems(
      this.args.popoverElement.querySelectorAll(
        `[role=${this.args.listItemRole}]`
      )
    );

    if (event.key === "ArrowDown") {
      event.preventDefault();
      this.args.setFocusedItemIndex(FocusDirection.Next);
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      this.args.setFocusedItemIndex(FocusDirection.Previous);
    }
  }
}
