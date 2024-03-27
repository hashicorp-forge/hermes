import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import ConfigService from "hermes/services/config";
import FetchService from "hermes/services/fetch";
import { ProjectStatus } from "hermes/types/project-status";

export default class AuthenticatedProjectsIndexRoute extends Route {
  @service("fetch") declare fetchSvc: FetchService;
  @service("config") declare configSvc: ConfigService;

  // Have the model react to param changes
  queryParams = {
    status: {
      refreshModel: true,
    },
  };

  async model(params: { status: string }) {
    const projects = await this.fetchSvc
      .fetch(
        `/api/${this.configSvc.config.api_version}/projects?status=${params.status}`,
      )
      .then((response) => response?.json());

    return { projects, status: params.status as ProjectStatus };
  }
}
