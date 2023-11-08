import Service, { inject as service } from "@ember/service";
import { tracked } from "@glimmer/tracking";
import { task } from "ember-concurrency";
import ConfigService from "hermes/services/config";
import FetchService from "./fetch";
import { assert } from "@ember/debug";

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
