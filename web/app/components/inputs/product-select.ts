import { assert } from "@ember/debug";
import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { task } from "ember-concurrency";
import FetchService from "hermes/services/fetch";

interface InputsProductSelectSignatureSignature {
  Element: null;
  Args: {};
  Blocks: {
    default: [];
  };
}

type ProductAreas = {
  [key: string]: {
    abbreviation: string;
    perDocDataType: unknown;
  };
};

export default class InputsProductSelectSignature extends Component<InputsProductSelectSignatureSignature> {
  @tracked _products: ProductAreas | undefined = undefined;
  @tracked shownProducts: ProductAreas | null = null;

  get products() {
    assert("_products must exist", this._products);
    return this._products;
  }

  @service("fetch") declare fetchSvc: FetchService;
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
