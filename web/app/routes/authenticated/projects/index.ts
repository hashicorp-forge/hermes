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
      .fetch(`/projects`)
      .then((response) => response?.json());

    // We'll eventually use the status param in the query;
    // for now, we pass it to the component for local filtering

    return { projects, status: params.status as ProjectStatus };
  }
}
