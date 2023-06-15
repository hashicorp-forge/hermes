import { assert } from "@ember/debug";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";
import { Placement } from "@floating-ui/dom";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { task } from "ember-concurrency";
import FetchService from "hermes/services/fetch";
import getProductId from "hermes/utils/get-product-id";

interface InputsProductSelectSignature {
  Element: HTMLDivElement;
  Args: {
    selected?: string;
    onChange: (value: string, attributes?: ProductArea) => void;
    formatIsBadge?: boolean;
    placement?: Placement;
    isSaving?: boolean;
    renderOut?: boolean;
  };
}

type ProductAreas = {
  [key: string]: ProductArea;
};

export type ProductArea = {
  abbreviation: string;
  perDocDataType: unknown;
};

export default class InputsProductSelectComponent extends Component<InputsProductSelectSignature> {
  @service("fetch") declare fetchSvc: FetchService;

  @tracked selected = this.args.selected;

  @tracked products: ProductAreas | undefined = undefined;

  get icon(): string {
    let icon = "folder";
    if (this.selected && getProductId(this.selected)) {
      icon = getProductId(this.selected) as string;
    }
    return icon;
  }

  get selectedProductAbbreviation(): string | null {
    if (!this.selected) {
      return null;
    }
    const selectedProduct = this.products?.[this.selected];
    assert("selected product must exist", selectedProduct);
    return selectedProduct.abbreviation;
  }

  @action onChange(newValue: any, attributes?: ProductArea) {
    this.selected = newValue;
    this.args.onChange(newValue, attributes);
  }

  protected fetchProducts = task(async () => {
    try {
      let products = await this.fetchSvc
        .fetch("/api/v1/products")
        .then((resp) => resp?.json());
      this.products = products;
    } catch (err) {
      console.error(err);
      throw err;
    }
  });
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Inputs::ProductSelect": typeof InputsProductSelectComponent;
  }
}
