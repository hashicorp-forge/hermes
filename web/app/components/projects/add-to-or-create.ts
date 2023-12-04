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

  @tracked protected shownProjects: HermesProject[] = [];

  @action protected maybeClose() {
    // TODO: this should be explained
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

    void this.searchProjects.perform();
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
   * The action run when the component is inserted.
   * Saves the dropdown API and runs the initial search.
   */
  protected loadInitialData = task(async (dd: XDropdownListAnchorAPI) => {
    this.dd = dd;
    await this.searchProjects.perform();
  });

  /**
   * The task to search for projects.
   * Formats and runs an Algolia query to exclude archived projects
   * and projects already associated with the document.
   * Sets the `shownProjects` property to the results
   * and schedules the dropdown to assign menu item IDs.
   */
  protected searchProjects = restartableTask(async () => {
    try {
      let filters = `(NOT status:"${ProjectStatus.Archived.toLowerCase()}")`;

      if (this.args.document.projects?.length) {
        filters = filters.slice(0, -1) + " ";
        filters += ` AND NOT objectID:"${this.args.document.projects.join(
          '" AND NOT objectID:"',
        )}")`;
      }
      // this doesn't return `products` in the payload
      await this.algolia.searchIndex
        .perform(
          this.configSvc.config.algolia_projects_index_name,
          this.query,
          {
            filters,
            // FIXME: doesn't seem to be ranking these higher
            optionalFilters: `status:"${ProjectStatus.Active}"`,
          },
        )
        .then((response) => {
          // TODO: do we want to trim to 4 or let the user scroll?
          this.shownProjects = response.hits as unknown as HermesProject[];
        });
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
