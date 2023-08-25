import Component from "@glimmer/component";
import { HermesProject } from "hermes/routes/authenticated/all/projects";

interface AllProjectsComponentSignature {
  Args: {
    projects: HermesProject[];
  };
}

export default class AllProjectsComponent extends Component<AllProjectsComponentSignature> {
  // we may want some "sortedProjects" computed property here
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "All::Projects": typeof AllProjectsComponent;
  }
}
