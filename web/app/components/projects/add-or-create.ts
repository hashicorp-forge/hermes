import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { HermesProject, JiraObject } from "hermes/types/project";
import { ProjectStatus } from "hermes/types/project-status";
import { RelatedHermesDocument } from "../related-resources";
import { action } from "@ember/object";
import { HermesDocument } from "hermes/types/document";

interface ProjectsAddOrCreateSignature {
  Args: {
    onClose: () => void;
    document: HermesDocument;
  };
}

export default class ProjectsAddOrCreate extends Component<ProjectsAddOrCreateSignature> {
  @tracked protected searchIsRunning = false;
  @tracked protected inputValue = "";

  @tracked protected newProjectFormIsShowing = false;
  @tracked protected newProjectTitle = "";
  @tracked protected newProjectDescription = "";
  @tracked protected newProjectJiraObject = {};

  protected get inputValueIsEmpty(): boolean {
    console.log("inputValueIsEmpty");
    return this.inputValue.length === 0;
  }

  protected get algoliaResults(): Record<string, HermesProject> {
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
          key: "HERMES-022",
        } as JiraObject,
        creator: "test",
        dateCreated: 123,
        dateModified: 123,
        status: ProjectStatus.Active,
      },
      "3": {
        id: "3",
        title: "Surveying users about their account creation experience",
        hermesDocuments: [
          { product: "Labs" },
          { product: "Waypoint" },
        ] as RelatedHermesDocument[],
        creator: "test",
        dateCreated: 123,
        dateModified: 123,
        status: ProjectStatus.Active,
      },
      "4": {
        id: "4",
        title: "Login flow for new users",
        hermesDocuments: [
          { product: "Cloud Platform" },
          { product: "Security" },
        ] as RelatedHermesDocument[],
        jiraObject: {
          key: "SEC-418",
        } as JiraObject,
        creator: "test",
        dateCreated: 123,
        dateModified: 123,
        status: ProjectStatus.Active,
      },
    };
  }

  @action protected showNewProjectForm() {
    this.newProjectFormIsShowing = true;
  }

  @action protected updateInputValue(event: Event) {
    this.searchIsRunning = true;
    this.inputValue = (event.target as HTMLInputElement).value;

    setTimeout(() => {
      this.searchIsRunning = false;
    }, 400);
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Projects::AddOrCreate": typeof ProjectsAddOrCreate;
  }
}
