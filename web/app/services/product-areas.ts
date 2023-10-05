import Service, { inject as service } from "@ember/service";
import { tracked } from "@glimmer/tracking";
import { task } from "ember-concurrency";
import FetchService from "./fetch";
import { assert } from "@ember/debug";

export type ProductArea = {
  abbreviation: string;
};

export default class ProductAreasService extends Service {
  @service("fetch") declare fetchSvc: FetchService;

  @tracked _index: Record<string, ProductArea> | null = null;

  get index() {
    assert("_index must exist", this._index);
    return this._index;
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
