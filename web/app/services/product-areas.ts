import Service, { inject as service } from "@ember/service";
import { tracked } from "@glimmer/tracking";
import { task } from "ember-concurrency";
import ConfigService from "hermes/services/config";
import FetchService from "./fetch";

export type ProductArea = {
  abbreviation: string;
};

export default class ProductAreasService extends Service {
  @service("config") declare configSvc: ConfigService;
  @service("fetch") declare fetchSvc: FetchService;

  @tracked index: Record<string, ProductArea> | null = null;

  fetch = task(async () => {
    try {
      this.index = await this.fetchSvc
        .fetch(`/api/${this.configSvc.config.api_version}/products`)
        .then((resp) => resp?.json());
    } catch (err) {
      this.index = null;
      throw err;
    }
  });
}
