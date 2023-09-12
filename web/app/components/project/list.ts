import Component from "@glimmer/component";
import { HermesProject } from "hermes/routes/authenticated/projects";

interface ProjectListComponentSignature {
  Args: {
    projects: HermesProject[];
  };
}

export default class ProjectListComponent extends Component<ProjectListComponentSignature> {
  // we may want some "sortedProjects" computed property here
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Project::List": typeof ProjectListComponent;
  }
}
