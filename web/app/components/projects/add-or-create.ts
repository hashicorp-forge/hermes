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

interface ProjectsAddOrCreateSignature {
  Args: {
    onClose: () => void;
    document: HermesDocument;
  };
}

export default class ProjectsAddOrCreate extends Component<ProjectsAddOrCreateSignature> {
  @service("fetch") declare fetchSvc: FetchService;
  @service("config") declare configSvc: ConfigService;
  @service declare algolia: AlgoliaService;

  @tracked protected searchIsRunning = false;
  @tracked protected inputValue = "";

  @tracked protected newProjectFormIsShown = false;
  @tracked protected newProjectTitle = "";
  @tracked protected newProjectDescription = "";
  @tracked protected newProjectJiraObject = {};
  @tracked protected shownProjects: HermesProject[] = [];

  protected get inputValueIsEmpty(): boolean {
    return this.inputValue.length === 0;
  }

  @action protected maybeClose() {
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

    void this.searchProjects.perform();
  }

  @action protected addDocumentToProject(
    _index: number,
    project: AlgoliaObject<HermesProjectInfo>,
  ) {
    console.log("adding document to project...", project);
    // FIXME: id is the index not the ID, need to get the project id.
    const projectWithID = {
      ...project,
      id: project.objectID,
    } as AlgoliaObject<HermesProjectInfo>;

    void this.saveProjectRelatedResources.perform(projectWithID);
    // hide the modal?
    this.args.onClose();

    // this needs to update the sidebar array
  }

  protected loadInitialData = task(async () => {
    // FIXME: hover/keyboard isn't working after modal closes once
    // TODO: need to reset the itemIndex or something
    await this.searchProjects.perform();
  });

  protected searchProjects = restartableTask(async () => {
    try {
      this.searchIsRunning = true;
      await this.algolia.searchIndex
        .perform(
          this.configSvc.config.algolia_projects_index_name,
          this.inputValue,
          {
            // we may want to add some optionalFilters here
          },
        )
        .then((response) => {
          // TODO: do we want to trim to 4 or let the user scroll?
          // do we want to do it as a hitsPerPage param?
          this.shownProjects = response.hits as unknown as HermesProject[];
          this.searchIsRunning = false;
        });
    } catch (e: unknown) {
      this.searchIsRunning = false;
      console.log(e);
      // TODO: handle
    }
  });

  protected saveProjectRelatedResources = task(
    async (project: AlgoliaObject<HermesProjectInfo>) => {
      const projectResources = await this.fetchSvc
        .fetch(
          `/api/${this.configSvc.config.api_version}/projects/${project.objectID}/related-resources`,
        )
        .then((response) => response?.json());

      let hermesDocuments = projectResources.hermesDocuments ?? [];

      const externalLinks = projectResources.externalLinks ?? [];

      const newRelatedHermesDocument = formatRelatedHermesDocument(
        this.args.document,
      );

      hermesDocuments.unshift(newRelatedHermesDocument);

      updateRelatedResourcesSortOrder(hermesDocuments, externalLinks ?? []);

      await this.fetchSvc.fetch(
        `/api/${this.configSvc.config.api_version}/projects/${project.objectID}/related-resources`,
        {
          method: "POST",
          body: JSON.stringify({
            hermesDocuments: hermesDocuments.map(
              (doc: RelatedHermesDocument) => {
                return {
                  googleFileID: doc.googleFileID,
                  sortOrder: doc.sortOrder,
                };
              },
            ),
            externalLinks,
          }),
        },
      );
    },
  );
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Projects::AddOrCreate": typeof ProjectsAddOrCreate;
  }
}
