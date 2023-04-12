import { assert } from "@ember/debug";
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

  @tracked products: ProductAreas | undefined = undefined;
  @tracked shownProducts: ProductAreas | null = null;

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
