import Service, { inject as service } from "@ember/service";
import { tracked } from "@glimmer/tracking";
import { task } from "ember-concurrency";
import ConfigService from "hermes/services/config";
import FetchService from "./fetch";
import { assert } from "@ember/debug";
import hashValue from "hash-value";

const HDS_COLORS = [
  "#3b3d45",
  "#656a76",
  "#c2c5cb",
  "#dedfe3",

  "#51130a",
  "#940004",
  "#c00005",
  "#fbd4d4",

  "#542800",
  "#803d00",
  "#9e4b00",
  "#bb5a00",
  "#fbeabf",

  "#054220",
  "#006619",
  "#00781e",
  "#cceeda",

  "#42215b",
  "#7b00db",
  "#911ced",
  "#ead2fe",

  "#1c345f",
  "#0046d1",
  "#0c56e9",
  "#1060ff",
  "#cce3fe",
];

const EXTENDED_COLORS = [
  "#ffd814",
  "#feec7b",
  "#fff9cf",

  "#d01c5b",
  "#ffcede",

  "#008196",
  "#62d4dc",

  "#63d0ff",
  "#d4f2ff",

  "#60dea9",
  "#d3fdeb",
];

export type ProductArea = {
  abbreviation: string;
};

export default class ProductAreasService extends Service {
  @service("config") declare configSvc: ConfigService;
  @service("fetch") declare fetchSvc: FetchService;

  @tracked _index: Record<string, ProductArea> | null = null;

  /**
   * An asserted-true reference to the `_index` property.
   */
  get index(): Record<string, ProductArea> {
    assert("_index must exist", this._index);
    return this._index;
  }
  /**
   * A helper to get a hash-based color for a product.
   * Used wherever the color is needed, e.g.,
   * the ProductSelect component.
   */
  getProductColor(product?: string) {
    if (!product) {
      return;
    }

    return hashValue(product, [...HDS_COLORS, ...EXTENDED_COLORS]);
  }

  /**
   * A helper function to get the abbreviation for a product.
   * Used wherever the abbreviation is needed, e.g.,
   * the ProductSelect component.
   */
  getAbbreviation(productName?: string): string | undefined {
    if (!productName) {
      return;
    }

    const product = this.index[productName];

    if (!product) {
      return;
    }

    return product.abbreviation;
  }

  /**
   * The fetch request to the `/products` endpoint.
   * Called on login by the `/authenticated` route.
   * Stores the response in the `_index` property.
   */
  fetch = task(async () => {
    try {
      this._index = await this.fetchSvc
        .fetch(`/api/${this.configSvc.config.api_version}/products`)
        .then((resp) => resp?.json());
    } catch (err) {
      this._index = null;
      throw err;
    }
  });
}
