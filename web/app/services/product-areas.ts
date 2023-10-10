import Service, { inject as service } from "@ember/service";
import { tracked } from "@glimmer/tracking";
import { task } from "ember-concurrency";
import FetchService from "./fetch";
import { assert } from "@ember/debug";

export type ProductArea = {
  abbreviation: string;
  color?: string;
};

export default class ProductAreasService extends Service {
  @service("fetch") declare fetchSvc: FetchService;

  @tracked _index: Record<string, ProductArea> | null = null;

  get index(): Record<string, ProductArea> {
    assert("_index must exist", this._index);

    return Object.fromEntries(
      Object.entries(this._index).map(([key, value]) => [
        key,
        { ...value, color: "#320984" },
      ]),
    );
  }

  getAbbreviation(productName?: string): string | undefined {
    if (!productName) {
      return;
    }

    const product = this.index[productName];

    if (!product) {
      return;
    }

    return product.abbreviation.slice(0, 3).toUpperCase();
  }

  fetch = task(async () => {
    try {
      this._index = await this.fetchSvc
        .fetch("/api/v1/products")
        .then((resp) => resp?.json());
    } catch (err) {
      this._index = null;
      throw err;
    }
  });
}
