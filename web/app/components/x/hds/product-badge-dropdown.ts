import { assert } from "@ember/debug";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { task } from "ember-concurrency";
import FetchService from "hermes/services/fetch";

interface XHdsBadgeDropdownSignature {
  Args: {
    currentProduct: string;
    options: string[];
    onChange: (value: string) => void;
    readonly: boolean;
  };
}

type ProductAreas = {
  [key: string]: {
    abbreviation: string;
    perDocDataType: unknown;
  };
};

export default class XHdsBadgeDropdown extends Component<XHdsBadgeDropdownSignature> {
  @service("fetch") declare fetchSvc: FetchService;

  @tracked _trigger: HTMLElement | null = null;
  @tracked _products: ProductAreas | undefined = undefined;
  @tracked _input: HTMLInputElement | null = null;

  @tracked popoverIsShown = false;

  @tracked filteredProducts: ProductAreas | null = null;

  get shownProducts() {
    return this.filteredProducts || this.products;
  }

  get trigger() {
    assert("trigger must exist", this._trigger);
    return this._trigger;
  }

  get products() {
    assert("products must exist", this._products);
    return this._products;
  }

  get input() {
    assert("input must exist", this._input);
    return this._input;
  }

  @action togglePopover() {
    if (this.popoverIsShown) {
      this.hidePopover();
    } else {
      this.popoverIsShown = true;
    }
  }

  @action hidePopover() {
    this.popoverIsShown = false;
    this.filteredProducts = null;
  }

  get inputIsShown() {
    // if the number of object keys in the products
    // is greater than 1, then show the input
    return Object.keys(this.products).length > 1;
  }

  @action didInsertTrigger(e: HTMLElement) {
    this._trigger = e;
    void this.fetchProducts.perform();
  }

  @action registerAndFocusInput(e: HTMLInputElement) {
    this._input = e;
    this.input.focus();
  }

  @action onInput(e: InputEvent) {
    // filter the products by the input value
    let value = this.input.value;
    if (value) {
      this.filteredProducts = Object.fromEntries(
        Object.entries(this.products).filter(([key]) =>
          key.toLowerCase().includes(value.toLowerCase())
        )
      );
    } else {
      this.filteredProducts = null;
    }
  }

  protected fetchProducts = task(async () => {
    try {
      let products = await this.fetchSvc
        .fetch("/api/v1/products")
        .then((resp) => resp?.json());
      this._products = products;
    } catch (err) {
      console.error(err);
      throw err;
    }
  });
}
