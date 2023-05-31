import { assert } from "@ember/debug";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";
import { Placement } from "@floating-ui/dom";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { task } from "ember-concurrency";
import FetchService from "hermes/services/fetch";
import { BadgeSize } from "hermes/types/hds-badge";

interface InputsProductSelectSignature {
  Element: HTMLDivElement;
  Args: {
    selected?: string;
    onChange: (value: string) => void;
    badgeSize?: BadgeSize;
    formatIsBadge?: boolean;
    placement?: Placement;
    isSaving?: boolean;
  };
}

type ProductAreas = {
  [key: string]: ProductArea;
};

type ProductArea = {
  abbreviation: string;
  perDocDataType: unknown;
};

export default class InputsProductSelectComponent extends Component<InputsProductSelectSignature> {
  @service("fetch") declare fetchSvc: FetchService;

  @tracked selected = this.args.selected;

  @tracked products: ProductAreas | undefined = undefined;

  get selectedProductAbbreviation(): string | undefined {
    if (!this.selected) {
      return undefined;
    }
    assert("products must be loaded", this.products);
    return this.products[this.selected]?.abbreviation;
  }

  @action onChange(newValue: any) {
    this.selected = newValue;
    this.args.onChange(newValue);
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
