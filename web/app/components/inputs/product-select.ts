import { assert } from "@ember/debug";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";
import { Placement } from "@floating-ui/dom";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { task } from "ember-concurrency";
import FetchService from "hermes/services/fetch";
import { BadgeSize } from "hermes/types/hds-badge";

interface InputsProductSelectSignatureSignature {
  Element: HTMLDivElement;
  Args: {
    selected?: any;
    onChange: (value: string, abbreviation: string) => void;
    badgeSize?: BadgeSize;
    formatIsBadge?: boolean;
    placement?: Placement;
    isSaving?: boolean;
  };
}

type ProductAreas = {
  [key: string]: {
    abbreviation: string;
    perDocDataType: unknown;
  };
};

export default class InputsProductSelectSignature extends Component<InputsProductSelectSignatureSignature> {
  @service("fetch") declare fetchSvc: FetchService;

  @tracked selected = this.args.selected;

  @tracked products: ProductAreas | undefined = undefined;

  get selectedProductAbbreviation() {
    return this.products?.[this.selected]?.abbreviation;
  }

  @action onChange(newValue: any) {
    this.selected = newValue;
    const productAbbreviation = this.products?.[newValue]?.abbreviation;
    assert(
      "onChange expects a valid productAbbreviation",
      typeof productAbbreviation === "string"
    );
    this.args.onChange(newValue, productAbbreviation);
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
    "Inputs::ProductSelect": typeof InputsProductSelectSignature;
  }
}
