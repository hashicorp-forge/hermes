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
import formatRelatedHermesDocument from "hermes/utils/format-related-hermes-document";
import updateRelatedResourcesSortOrder from "hermes/utils/update-related-resources-sort-order";
import AlgoliaService from "hermes/services/algolia";
import { RelatedHermesDocument } from "../related-resources";
import { ProjectStatus } from "hermes/types/project-status";
import { XDropdownListAnchorAPI } from "../x/dropdown-list";
import { next } from "@ember/runloop";

interface ProjectsAddOrCreateSignature {
  Args: {
    onClose: () => void;
    onSave: (project: AlgoliaObject<HermesProjectInfo>) => void;
    document: HermesDocument;
  };
}

export default class ProjectsAddOrCreate extends Component<ProjectsAddOrCreateSignature> {
  @service("fetch") declare fetchSvc: FetchService;
  @service("config") declare configSvc: ConfigService;
  @service declare algolia: AlgoliaService;

  @tracked protected searchIsRunning = false;
  @tracked protected inputValue = "";

  @tracked private dd: XDropdownListAnchorAPI | null = null;

  @tracked protected newProjectFormIsShown = false;
  @tracked protected newProjectTitle = "";
  @tracked protected newProjectDescription = "";
  @tracked protected newProjectJiraObject = {};
  @tracked protected shownProjects: HermesProject[] = [];

  protected get inputValueIsEmpty(): boolean {
    return this.inputValue.length === 0;
  }

  @action protected maybeClose() {
    // TODO: this should be explained
    if (!this.newProjectFormIsShown) {
      this.args.onClose();
    }
  }

  @action protected showNewProjectForm() {
    this.newProjectFormIsShown = true;
  }

  @action protected updateInputValue(eventOrValue: Event | string) {
    if (typeof eventOrValue === "string") {
      this.inputValue = eventOrValue;
    } else {
      this.inputValue = (eventOrValue.target as HTMLInputElement).value;
    }

    // TODO: this should be a parent function

    void this.searchProjects.perform();
  }

  @action protected addDocumentToProject(
    _index: number,
    project: AlgoliaObject<HermesProjectInfo>,
  ) {
    const projectWithID = {
      ...project,
      id: project.objectID,
    } as AlgoliaObject<HermesProjectInfo>;

    void this.args.onSave(projectWithID);
    this.args.onClose();
  }

  protected loadInitialData = task(async (dd: XDropdownListAnchorAPI) => {
    this.dd = dd;
    await this.searchProjects.perform();
  });

  protected searchProjects = restartableTask(async () => {
    try {
      this.searchIsRunning = true;

      let filters = `(NOT status:"${ProjectStatus.Archived.toLowerCase()}")`;

      if (this.args.document.projects?.length) {
        filters = filters.slice(0, -1) + " ";
        filters += ` AND NOT objectID:"${this.args.document.projects.join(
          '" AND NOT objectID:"',
        )}")`;
      }

      await this.algolia.searchIndex
        .perform(
          this.configSvc.config.algolia_projects_index_name,
          this.inputValue,
          {
            filters,
            optionalFilters: `status:"${ProjectStatus.Active}"`,
          },
        )
        .then((response) => {
          // TODO: do we want to trim to 4 or let the user scroll?
          // do we want to do it as a hitsPerPage param?
          this.shownProjects = response.hits as unknown as HermesProject[];
          this.searchIsRunning = false;
        });
      next(() => {
        this.dd?.scheduleAssignMenuItemIDs();
      });
    } catch (e: unknown) {
      this.searchIsRunning = false;
      console.log(e);
      // TODO: handle
    }
  });
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Projects::AddOrCreate": typeof ProjectsAddOrCreate;
  }
}
