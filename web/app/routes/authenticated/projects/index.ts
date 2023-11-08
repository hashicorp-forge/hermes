import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import ConfigService from "hermes/services/config";
import FetchService from "hermes/services/fetch";
import { HermesProject } from "hermes/types/project";

export default class AuthenticatedProjectsIndexRoute extends Route {
  @service("fetch") declare fetchSvc: FetchService;
  @service("config") declare configSvc: ConfigService;

  async model() {
    const projects = await this.fetchSvc
      .fetch(`/api/${this.configSvc.config.api_version}/projects`)
      .then((response) => response?.json());

    return await Promise.all(
      projects.map(async (project: HermesProject) => {
        const resources = await this.fetchSvc
          .fetch(
            `/api/${this.configSvc.config.api_version}/projects/${project.id}/related-resources`,
          )
          .then((response) => response?.json());

        const { hermesDocuments, externalLinks } = resources;

        return { ...project, hermesDocuments, externalLinks };
      }),
    );
  }
}
