import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import {
  AlgoliaObject,
  HermesProject,
  HermesProjectInfo,
} from "hermes/types/project";
import { action } from "@ember/object";
import { HermesDocument } from "hermes/types/document";
import { restartableTask, task } from "ember-concurrency";
import FetchService from "hermes/services/fetch";
import { inject as service } from "@ember/service";
import ConfigService from "hermes/services/config";
import AlgoliaService from "hermes/services/algolia";
import { ProjectStatus } from "hermes/types/project-status";
import { XDropdownListAnchorAPI } from "../x/dropdown-list";
import { next } from "@ember/runloop";

interface ProjectsAddToOrCreateSignature {
  Args: {
    onClose: () => void;
    onSave: (project: AlgoliaObject<HermesProjectInfo>) => void;
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
  @tracked private projectResults: HermesProject[] | null = null;

  protected get shownProjects() {
    if (!this.projectResults) {
      return [];
    }

    return this.projectResults
      .filter((project: HermesProject) => {
        return (
          project.status !== ProjectStatus.Archived &&
          !this.args.document.projects?.includes(parseInt(project.id)) &&
          project.title.toLowerCase().includes(this.query.toLowerCase())
        );
      })
      .slice(0, 10);
  }

  // TODO: explain this
  @action protected maybeClose() {
    if (!this.newProjectFormIsShown) {
      this.args.onClose();
    }
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
  @action protected onSave(
    _index: number,
    project: AlgoliaObject<HermesProjectInfo>,
  ) {
    void this.args.onSave(project);
    this.args.onClose();
  }

  /**
   * TODO: explain this
   */
  protected loadProjects = task(async (dd: XDropdownListAnchorAPI) => {
    this.dd = dd;

    try {
      this.projectResults = await this.fetchSvc
        .fetch(
          `/api/${this.configSvc.config.api_version}/projects?query=${this.query}`,
        )
        .then((response) => response?.json());

      next(() => {
        this.dd?.scheduleAssignMenuItemIDs();
      });
    } catch (e: unknown) {
      console.log(e);
      // TODO: handle
    }
  });
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Projects::AddToOrCreate": typeof ProjectsAddToOrCreate;
  }
}
