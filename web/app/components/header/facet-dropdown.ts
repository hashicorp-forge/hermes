import Component from "@glimmer/component";
import { action } from "@ember/object";
import { FacetDropdownObjects } from "hermes/types/facets";
import { tracked } from "@glimmer/tracking";
import { inject as service } from "@ember/service";
import RouterService from "@ember/routing/router-service";
import { restartableTask } from "ember-concurrency";
import { assert } from "@ember/debug";

interface FacetDropdownComponentSignature {
  Args: {
    onClick: (facetName: FacetNames, value: string) => void;
    label: string;
    facets: FacetDropdownObjects;
    disabled: boolean;
  };
}

export enum FacetNames {
  DocType = "docType",
  Owners = "owners",
  Status = "status",
  Product = "product",
}

enum FocusDirection {
  Previous = "previous",
  Next = "next",
}

export default class FacetDropdownComponent extends Component<FacetDropdownComponentSignature> {
  @service declare router: RouterService;

  @tracked private query: string = "";
  @tracked private menuItemFocusIndex = -1;

  @tracked private _triggerElement: HTMLButtonElement | null = null;
  @tracked private _inputElement: HTMLInputElement | null = null;

  @tracked protected dropdownIsShown = false;
  @tracked protected shownFacets = this.args.facets;

  protected get triggerElement(): HTMLButtonElement {
    assert("_triggerElement must exist", this._triggerElement);
    return this._triggerElement;
  }

  private get inputElement(): HTMLInputElement {
    assert("_inputElement must exist", this._inputElement);
    return this._inputElement;
  }

  protected get inputIsShown() {
    return Object.entries(this.args.facets).length > 12;
  }

  protected get currentRouteName(): string {
    return this.router.currentRouteName;
  }

  onInput = restartableTask(async (inputEvent: InputEvent) => {
    this.query = (inputEvent.target as HTMLInputElement).value;

    let facets = this.args.facets;
    let shownFacets: FacetDropdownObjects = {};

    for (const [key, value] of Object.entries(facets)) {
      if (key.toLowerCase().includes(this.query.toLowerCase())) {
        shownFacets[key] = value;
      }
    }
    this.shownFacets = shownFacets;
  });

  @action protected registerTrigger(element: HTMLButtonElement) {
    this._triggerElement = element;
  }

  @action protected registerInput(element: HTMLInputElement) {
    this._inputElement = element;
  }

  @action protected onKeydown(event: KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      this.setFocusTo(FocusDirection.Next);
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      this.setFocusTo(FocusDirection.Previous);
    }
  }

  @action protected resetMenuItemIndex() {
    this.menuItemFocusIndex = -1;
  }

  private setFocusTo(focusDirection: FocusDirection) {
    let menuItems = document.querySelectorAll(".facet-dropdown-menu li a");
    if (menuItems.length === 0) {
      return;
    }

    if (focusDirection === FocusDirection.Next) {
      if (this.menuItemFocusIndex === menuItems.length - 1) {
        this.menuItemFocusIndex = 0;
      } else {
        this.menuItemFocusIndex++;
      }
    }

    if (focusDirection === FocusDirection.Previous) {
      if (this.menuItemFocusIndex === -1) {
        this.menuItemFocusIndex = menuItems.length - 1;
      } else if (this.menuItemFocusIndex === 0 && this.inputIsShown) {
        this.inputElement.focus();
        this.resetMenuItemIndex();
        return;
      } else {
        this.menuItemFocusIndex--;
      }
    }
    (menuItems[this.menuItemFocusIndex] as HTMLElement).focus();
  }

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

  @action protected toggleDropdown(): void {
    if (this.dropdownIsShown) {
      this.hideDropdown();
    } else {
      this.dropdownIsShown = true;
    }
  }

  @action protected hideDropdown(): void {
    this.dropdownIsShown = false;
    this.query = "";
    this.resetMenuItemIndex();
    this.shownFacets = this.args.facets;
  }

  @action onClick(value: string, close: () => void) {
    if (this.facetName) {
      this.args.onClick(this.facetName, value);
    }
    close();
  }
}
