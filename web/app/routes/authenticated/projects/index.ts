import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import ConfigService from "hermes/services/config";
import FetchService from "hermes/services/fetch";
import { HermesProject } from "hermes/types/project";

export default class AuthenticatedProjectsIndexRoute extends Route {
  @service("fetch") declare fetchSvc: FetchService;
  @service("config") declare configSvc: ConfigService;

  async model() {
    return await this.fetchSvc
      .fetch(`/api/${this.configSvc.config.api_version}/projects`)
      .then((response) => response?.json());

    // we're fetching all the projects
    // now we need to get the related hermes documents for every projects
    // so we can display the product icons in the tile
  }
}
