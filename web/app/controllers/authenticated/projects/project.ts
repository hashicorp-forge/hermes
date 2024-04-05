import Controller from "@ember/controller";
import { tracked } from "@glimmer/tracking";
import AuthenticatedProjectsProjectRoute from "hermes/routes/authenticated/projects/project";
import { ModelFrom } from "hermes/types/route-models";

export default class AuthenticatedProjectsProjectController extends Controller {
  declare model: ModelFrom<AuthenticatedProjectsProjectRoute>;

  /**
   * Whether a new project has loaded from the project route,
   * as is the case when clicking a project from the search popover
   * while already viewing a project. In these cases, the model
   * will set `newModelHasLoaded` true to trigger a rerender.
   * Always set false in the `afterModel` hook.
   */
  @tracked newModelHasLoaded = false;
}

declare module "@ember/controller" {
  interface Registry {
    "authenticated.projects.project": AuthenticatedProjectsProjectController;
  }
}
