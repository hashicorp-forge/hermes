import Component from "@glimmer/component";
import { FacetDropdownObjects } from "hermes/types/facets";
import { action } from "@ember/object";
import { tracked } from "@glimmer/tracking";
import { assert } from "@ember/debug";
import { inject as service } from "@ember/service";
import RouterService from "@ember/routing/router-service";
import { FocusDirection } from "./facet-dropdown";

interface HeaderFacetDropdownListComponentSignature {
  Args: {
    /**
     * The facet's label, e.g., "Type," "Status."
     * Used to construct facet query hashes.
     */
    label: string;
    /**
     * Whether the facet dropdown has a filter input.
     * Used to set the correct aria role for the containers, lists, and list items,
     * and to determine the correct className for the dropdown.
     */
    inputIsShown: boolean;
    /**
     * The facets that should be shown in the dropdown.
     * Looped through in the tamplate to render the list items.
     * Used to determine whether a "No matches found" message should be shown.
     */
    shownFacets: FacetDropdownObjects;
    /**
     * The popover element, registered when its element is inserted.
     * Used to scope our querySelector calls.
     */
    popoverElement: HTMLDivElement | null;
    /**
     * The role of the list items.
     * Used in querySelector calls to specify the correct list items.
     */
    listItemRole: "option" | "menuitem";
    /**
     * An action called to reset the focusedItem index.
     * Used on input focusin, which happens on dropdown reveal.
     **/
    resetFocusedItemIndex: () => void;
    /**
     * The action run when the user types in the filter input.
     * Used to filter the shownFacets.
     */
    onInput: (event: InputEvent) => void;
    /**
     * The action run when the popover is inserted into the DOM.
     * Used to register the popover element for use in querySelector calls.
     */
    registerPopover: (element: HTMLDivElement) => void;
    /**
     * The action to move the focusedItemIndex within the dropdown.
     * Used on ArrowUp/ArrowDown/Enter keydown events,
     * and to pass to our child element for mouseenter events.
     */
    setFocusedItemIndex: (direction: FocusDirection) => void;
    /**
     * The action to hide the dropdown.
     * Called when the user presses the Enter key on a selection,
     * and passed to our child element for click events.
     */
    hideDropdown: () => void;
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

  /**
   * The input element, registered when its element is inserted
   * and asserted to exist in the inputElement getter.
   */
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
   * Whether there are no matches found for the user's input.
   * Used to show a "No matches found" message in the template.
   */
  protected get noMatchesFound(): boolean {
    if (!this.args.inputIsShown) {
      return false;
    }
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
  @action protected registerAndFocusInput(element: HTMLInputElement) {
    this._inputElement = element;
    this.inputElement.focus();
  }

  /**
   * The action run when the user presses a key.
   * Handles the arrow keys to navigate the dropdown or
   * hits Enter to select the focused item.
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
      assert("popoverElement must exist", this.args.popoverElement);
      const target = this.args.popoverElement.querySelector("[aria-selected]");

      if (target instanceof HTMLAnchorElement) {
        target.click();
        this.args.hideDropdown();
      }
    }
  }
}
