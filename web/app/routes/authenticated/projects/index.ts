import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import ConfigService from "hermes/services/config";
import FetchService from "hermes/services/fetch";
import { HermesProject } from "hermes/types/project";

export default class AuthenticatedProjectsIndexRoute extends Route {
  @service("fetch") declare fetchSvc: FetchService;
  @service("config") declare configSvc: ConfigService;

  async model(): Promise<HermesProject[]> {
    return await this.fetchSvc
      .fetch(`/api/${this.configSvc.config.api_version}/projects`)
      .then((response) => response?.json());
  }
}
