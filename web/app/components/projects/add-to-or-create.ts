import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { HermesProject, HermesProjectInfo } from "hermes/types/project";
import { action } from "@ember/object";
import { HermesDocument } from "hermes/types/document";
import { task } from "ember-concurrency";
import FetchService from "hermes/services/fetch";
import { service } from "@ember/service";
import ConfigService from "hermes/services/config";
import AlgoliaService from "hermes/services/algolia";
import { ProjectStatus } from "hermes/types/project-status";
import { XDropdownListAnchorAPI } from "../x/dropdown-list";
import { next } from "@ember/runloop";

interface ProjectsAddToOrCreateSignature {
  Args: {
    onClose: () => void;
    onSave: (project: HermesProjectInfo) => void;
    document: HermesDocument;
  };
}

export default class ProjectsAddToOrCreate extends Component<ProjectsAddToOrCreateSignature> {
  @service("fetch") declare fetchSvc: FetchService;
  @service("config") declare configSvc: ConfigService;
  @service declare algolia: AlgoliaService;

  @tracked protected query = "";
  @tracked private dd: XDropdownListAnchorAPI | null = null;
  @tracked protected newProjectFormIsShown = false;
  @tracked protected newProjectTitle = "";
  @tracked protected newProjectDescription = "";
  @tracked protected newProjectJiraObject = {};
  @tracked private activeProjects: HermesProject[] | null = null;

  /**
   * The projects that are shown in the search modal.
   * Filters out archived and completed projects, as well as projects
   * that are already associated with the document.
   */
  protected get shownProjects() {
    if (!this.activeProjects) {
      return [];
    }

    return this.activeProjects
      .filter((project: HermesProject) => {
        return (
          !this.args.document.projects?.includes(parseInt(project.id)) &&
          project.title.toLowerCase().includes(this.query.toLowerCase())
        );
      })
      .slice(0, 10);
  }

  /**
   * The action to show the new project form.
   * Replaces the search results with the new project form.
   */
  @action protected showNewProjectForm() {
    this.newProjectFormIsShown = true;
  }

  /**
   * The "input" action run on the search component.
   * Sets the local query and runs the search.
   */
  @action protected updateInputValue(event: Event) {
    // this may need to be eventOrValue?
    this.query = (event.target as HTMLInputElement).value;
  }

  /**
   * The action to save a document to a project.
   * Passed to X::DropdownList as `onClick`.
   * Calls the passed-in `onSave` and `onClose` actions.
   */
  @action protected onProjectClick(_index: number, project: HermesProjectInfo) {
    this.args.onSave(project);
    this.args.onClose();
  }

  /**
   * The action to load the projects list.
   * Called when the search modal is rendered.
   * Triggers a blank query to the projects API.
   */
  protected loadProjects = task(async (dd: XDropdownListAnchorAPI) => {
    this.dd = dd;

    const payload = await this.fetchSvc
      .fetch(
        `/api/${this.configSvc.config.api_version}/projects?status=${ProjectStatus.Active}`,
      )
      .then((response) => response?.json());

    this.activeProjects = payload.projects;

    next(() => {
      this.dd?.scheduleAssignMenuItemIDs();
    });
  });
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Projects::AddToOrCreate": typeof ProjectsAddToOrCreate;
  }
}
