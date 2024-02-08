import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import ConfigService from "hermes/services/config";
import FetchService from "hermes/services/fetch";
import StoreService from "hermes/services/store";
import { HermesProject } from "hermes/types/project";

export default class AuthenticatedProjectsProjectRoute extends Route {
  @service("fetch") declare fetchSvc: FetchService;
  @service("config") declare configSvc: ConfigService;
  @service declare store: StoreService;

  async model(params: { project_id: string }): Promise<HermesProject> {
    const projectPromise = this.fetchSvc
      .fetch(
        `/api/${this.configSvc.config.api_version}/projects/${params.project_id}`,
        {
          method: "GET",
          headers: {
            // We set this header to differentiate between project views and
            // requests to only retrieve project metadata.
            "Add-To-Recently-Viewed": "true",
          },
        },
      )
      .then((response) => response?.json());

    const projectResourcesPromise = this.fetchSvc
      .fetch(
        `/api/${this.configSvc.config.api_version}/projects/${params.project_id}/related-resources`,
      )
      .then((response) => response?.json());

    const [project, projectResources] = await Promise.all([
      projectPromise,
      projectResourcesPromise,
    ]);

    const { hermesDocuments, externalLinks } = projectResources;

    // Load owner information
    await this.store.maybeFetchPeople.perform(hermesDocuments);

    return {
      ...project,
      hermesDocuments,
      externalLinks,
    };
  }
}
