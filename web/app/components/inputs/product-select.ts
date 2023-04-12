import { action } from "@ember/object";
import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { task } from "ember-concurrency";
import FetchService from "hermes/services/fetch";

interface InputsProductSelectSignatureSignature {
  Args: {
    selected?: any;
    onChange: (value: any) => void;
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
  @tracked shownProducts: ProductAreas | null = null;

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
