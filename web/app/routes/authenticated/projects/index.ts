import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import { HITS_PER_PAGE } from "hermes/services/algolia";
import ConfigService from "hermes/services/config";
import FetchService from "hermes/services/fetch";
import { ProjectStatus } from "hermes/types/project-status";

interface AuthenticatedProjectsIndexRouteParams {
  status: string;
  page?: number;
}

export default class AuthenticatedProjectsIndexRoute extends Route {
  @service("fetch") declare fetchSvc: FetchService;
  @service("config") declare configSvc: ConfigService;

  // Have the model react to param changes
  queryParams = {
    status: {
      refreshModel: true,
    },
  };

  async model(params: AuthenticatedProjectsIndexRouteParams) {
    const projects = await this.fetchSvc
      .fetch(
        `/api/${this.configSvc.config.api_version}/projects?status=${
          params.status
        }&page=${params.page || 1}&hitsPerPage=${HITS_PER_PAGE}`,
      )
      .then((response) => response?.json());

    console.log("params.page", params.page);

    return { projects, status: params.status as ProjectStatus };
  }
}
