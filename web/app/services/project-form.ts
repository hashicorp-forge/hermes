import Service from "@ember/service";
import { tracked } from "@glimmer/tracking";

export default class ProjectFormService extends Service {
  /**
   * Whether the project is being created, or in the process of
   * transitioning to the project screen after successful creation.
   * Set by the `ProjectForm` and used to show loading states.
   * Reverted on error or when the project route is reached.
   */
  @tracked projectIsBeingCreated = false;
}

declare module "@ember/service" {
  interface Registry {
    projectForm: ProjectFormService;
  }
}
