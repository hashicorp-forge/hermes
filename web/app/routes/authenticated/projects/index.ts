import Route from "@ember/routing/route";
import { service } from "@ember/service";
import { HITS_PER_PAGE } from "hermes/services/algolia";
import ConfigService from "hermes/services/config";
import FetchService from "hermes/services/fetch";
import { ProjectStatus } from "hermes/types/project-status";

export const PROJECT_HITS_PER_PAGE = HITS_PER_PAGE * 2;

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
    page: {
      refreshModel: true,
    },
  };

  async model(params: AuthenticatedProjectsIndexRouteParams) {
    const payload = await this.fetchSvc
      .fetch(
        `/api/${this.configSvc.config.api_version}/projects?status=${
          params.status
        }&page=${params.page || 1}`,
      )
      .then((response) => response?.json());

    const { projects, page, numPages } = payload;

    return {
      projects,
      status: params.status as ProjectStatus,
      page,
      numPages,
    };
  }
}
