import Route from "@ember/routing/route";
import { schedule } from "@ember/runloop";
import { inject as service } from "@ember/service";
import AuthenticatedProjectsProjectController from "hermes/controllers/authenticated/projects/project";
import ProjectModel from "hermes/models/project";
import ConfigService from "hermes/services/config";
import FetchService from "hermes/services/fetch";
import RecentlyViewedService from "hermes/services/recently-viewed";
import StoreService from "hermes/services/store";
import { HermesProject } from "hermes/types/project";

export default class AuthenticatedProjectsProjectRoute extends Route {
  @service("fetch") declare fetchSvc: FetchService;
  @service("config") declare configSvc: ConfigService;
  @service declare recentlyViewed: RecentlyViewedService;
  @service declare store: StoreService;

  declare controller: AuthenticatedProjectsProjectController;

  async model(params: { project_id: string }): Promise<HermesProject> {
    const projectPromise = this.store.findRecord("project", params.project_id, {
      adapterOptions: { addToRecentlyViewed: true },
    }) as Promise<ProjectModel>;

    const projectResourcesPromise = this.fetchSvc
      .fetch(
        `/api/${this.configSvc.config.api_version}/projects/${params.project_id}/related-resources`,
      )
      .then((response) => response?.json());

    const [project, projectResources] = await Promise.all([
      projectPromise,
      projectResourcesPromise,
    ]);

    /**
     * If a project is loading from from the project route, as is the case when
     * clicking a project from the search popover while viewing a project,
     * this will trigger a template rerender to reset the local state.
     * In other cases, `this.controller` will be `undefined` and the
     * following line will be ignored.
     */
    this.controller?.set("newModelHasLoaded", true);

    const { hermesDocuments, externalLinks } = projectResources;

    // Load owner information
    await this.store.maybeFetchPeople.perform(hermesDocuments);

    const {
      id,
      createdTime,
      creator,
      description,
      jiraIssueID,
      modifiedTime,
      products,
      status,
      title,
    } = project;
    return {
      id,
      createdTime,
      creator,
      description,
      jiraIssueID,
      modifiedTime,
      products,
      status,
      title,
      hermesDocuments,
      externalLinks,
    };
  }

  afterModel() {
    /**
     * Update the recently viewed index in the background.
     */
    void this.recentlyViewed.fetchAll.perform();

    /**
     * Set `newModelHasLoaded` false in case it was set true in the model hook.
     */
    schedule("afterRender", () => {
      this.controller?.set("newModelHasLoaded", false);
    });
  }
}
