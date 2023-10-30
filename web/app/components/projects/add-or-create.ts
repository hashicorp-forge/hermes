import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { HermesProject, JiraObject } from "hermes/types/project";
import { ProjectStatus } from "hermes/types/project-status";
import { RelatedHermesDocument } from "../related-resources";
import { action } from "@ember/object";

interface ProjectsAddOrCreateSignature {
  Args: {
    onClose: () => void;
    docTitle: string;
  };
}

export default class ProjectsAddOrCreate extends Component<ProjectsAddOrCreateSignature> {
  @tracked protected inputValue = "";

  @tracked protected newProjectFormIsShowing = false;
  @tracked protected newProjectTitle = "";
  @tracked protected newProjectDescription = "";
  @tracked protected newProjectJiraObject = {};

  get algoliaResults(): Record<string, HermesProject> {
    return {
      "1": {
        id: "1",
        title: "Reducing account-creation friction",
        hermesDocuments: [
          { product: "Terraform" },
          { product: "Labs" },
          { product: "Engineering" },
        ] as RelatedHermesDocument[],
        jiraObject: {
          key: "TES-333",
        } as JiraObject,
        creator: "test",
        dateCreated: 123,
        dateModified: 123,
        status: ProjectStatus.Active,
      },
      "2": {
        id: "2",
        title: "Login flow for new users",
        hermesDocuments: [{ product: "Terraform" }] as RelatedHermesDocument[],
        jiraObject: {
          key: "TES-333",
        } as JiraObject,
        creator: "test",
        dateCreated: 123,
        dateModified: 123,
        status: ProjectStatus.Active,
      },
    };
  }

  @tracked protected searchIsRunning = false;

  @action protected showNewProjectForm() {
    this.newProjectFormIsShowing = true;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Projects::AddOrCreate": typeof ProjectsAddOrCreate;
  }
}
