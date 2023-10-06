import { assert } from "@ember/debug";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";
import { Placement } from "@floating-ui/dom";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { task } from "ember-concurrency";
import FetchService from "hermes/services/fetch";
import ProductAreasService, {
  ProductArea,
} from "hermes/services/product-areas";
import getProductID from "hermes/utils/get-product-id";

interface InputsProductSelectSignature {
  Element: HTMLDivElement;
  Args: {
    selected?: string;
    onChange: (value: string, attributes?: ProductArea) => void;
    placement?: Placement;
    isSaving?: boolean;
    renderOut?: boolean;
    isFullWidth?: boolean;
    productAbbreviationIsHidden?: boolean;
  };
}

export default class InputsProductSelectComponent extends Component<InputsProductSelectSignature> {
  @service("fetch") declare fetchSvc: FetchService;
  @service declare productAreas: ProductAreasService;

  @tracked selected = this.args.selected;

  get products() {
    return this.productAreas.index;
  }

  get icon(): string {
    let icon = "folder";
    if (this.selected && getProductID(this.selected)) {
      icon = getProductID(this.selected) as string;
    }
    return icon;
  }

  get selectedProductAbbreviation(): string | undefined {
    if (!this.selected) {
      return;
    }

    if (!this.products) {
      return;
    }

    if (this.args.productAbbreviationIsHidden) {
      return;
    }

    const selectedProduct = this.products?.[this.selected];
    assert("selected product must exist", selectedProduct);
    return selectedProduct.abbreviation;
  }

  @action onChange(newValue: any, attributes?: ProductArea) {
    this.selected = newValue;
    this.args.onChange(newValue, attributes);
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Inputs::ProductSelect": typeof InputsProductSelectComponent;
  }
}