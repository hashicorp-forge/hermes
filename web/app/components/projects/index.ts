import Component from "@glimmer/component";
import { HermesProject } from "hermes/routes/authenticated/projects";

interface ProjectsComponentSignature {
  Args: {
    projects: HermesProject[];
  };
}

export default class ProjectsComponent extends Component<ProjectsComponentSignature> {
  // we may want some "sortedProjects" computed property here
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    Projects: typeof ProjectsComponent;
  }
}
