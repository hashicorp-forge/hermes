import Service, { inject as service } from "@ember/service";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import RouterService from "@ember/routing/router-service";
import { task, timeout } from "ember-concurrency";
import FetchService from "./fetch";

export type ProductArea = {
  abbreviation: string;
};

export default class ProductAreasService extends Service {
  @service("fetch") declare fetchSvc: FetchService;

  @tracked index: Record<string, ProductArea> | null = null;

  fetch = task(async () => {
    try {
      this.index = await this.fetchSvc
        .fetch("/api/v1/products")
        .then((resp) => resp?.json());
    } catch (err) {
      this.index = null;
      throw err;
    }
  });
}
