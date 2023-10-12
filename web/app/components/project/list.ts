import { action } from "@ember/object";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { HermesProject } from "hermes/types/project";

interface ProjectListComponentSignature {
  Args: {
    projects: HermesProject[];
  };
}

export default class ProjectListComponent extends Component<ProjectListComponentSignature> {
  @tracked private container: HTMLElement | null = null;
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Project::List": typeof ProjectListComponent;
  }
}
