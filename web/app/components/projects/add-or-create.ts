import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { HermesProject, JiraIssue } from "hermes/types/project";
import { action } from "@ember/object";
import { HermesDocument } from "hermes/types/document";
import { restartableTask, task } from "ember-concurrency";
import FetchService from "hermes/services/fetch";
import { inject as service } from "@ember/service";
import ConfigService from "hermes/services/config";
import formatRelatedHermesDocument from "hermes/utils/format-related-hermes-document";
import updateRelatedResourcesSortOrder from "hermes/utils/update-related-resources-sort-order";
import AlgoliaService from "hermes/services/algolia";

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

  @tracked protected newProjectFormIsShowing = false;
  @tracked protected newProjectTitle = "";
  @tracked protected newProjectDescription = "";
  @tracked protected newProjectJiraObject = {};
  @tracked protected shownProjects: HermesProject[] = [];

  protected get inputValueIsEmpty(): boolean {
    return this.inputValue.length === 0;
  }

  @action protected showNewProjectForm() {
    this.newProjectFormIsShowing = true;
  }

  @action protected updateInputValue(eventOrValue: Event | string) {
    if (typeof eventOrValue === "string") {
      this.inputValue = eventOrValue;
    } else {
      this.inputValue = (eventOrValue.target as HTMLInputElement).value;
    }

    void this.searchProjects.perform();
  }

  @action protected addDocumentToProject(project: HermesProject) {
    console.log("addDocumentToProject", project);
    void this.saveProjectRelatedResources.perform(project);
  }

  protected searchProjects = restartableTask(async () => {
    //  need to make an algolia request to a projects index
    try {
      this.searchIsRunning = true;
      await this.algolia.searchIndex
        .perform(
          this.configSvc.config.algolia_projects_index_name,
          this.inputValue,
          {
            filters: "",
          },
        )
        .then((results) => {
          console.log("lugged");
          console.log(results);
        });
    } catch (e: unknown) {
      this.searchIsRunning = false;
      console.log(e);
      // TODO: handle
    }
  });

  protected saveProjectRelatedResources = task(
    async (project: HermesProject) => {
      let hermesDocuments = project.hermesDocuments ?? [];

      const newRelatedHermesDocument = formatRelatedHermesDocument(
        this.args.document,
      );

      hermesDocuments.unshift(newRelatedHermesDocument);

      let externalLinks = project.externalLinks ?? [];

      updateRelatedResourcesSortOrder(hermesDocuments, externalLinks ?? []);

      await this.fetchSvc.fetch(
        `/api/${this.configSvc.config.api_version}/projects/${project.id}/related-resources`,
        {
          method: "POST",
          body: JSON.stringify({
            hermesDocuments: hermesDocuments.map((doc) => {
              return {
                googleFileID: doc.googleFileID,
                sortOrder: doc.sortOrder,
              };
            }),
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
