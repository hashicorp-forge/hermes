import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import FetchService from "hermes/services/fetch";
import { HermesProject } from "hermes/types/project";

export default class AuthenticatedProjectsProjectRoute extends Route {
  @service("fetch") declare fetchSvc: FetchService;

  async model(params: { project_id: string }): Promise<HermesProject> {
    const projectPromise = this.fetchSvc
      .fetch(`/projects/${params.project_id}`)
      .then((response) => response?.json());

    const projectResourcesPromise = this.fetchSvc
      .fetch(`/projects/${params.project_id}/related-resources`)
      .then((response) => response?.json());

    const [project, projectResources] = await Promise.all([
      projectPromise,
      projectResourcesPromise,
    ]);

    const { hermesDocuments, externalLinks } = projectResources;

    return {
      ...project,
      hermesDocuments,
      externalLinks,
    };
  }
}
