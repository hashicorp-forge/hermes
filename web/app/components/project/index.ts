import Component from "@glimmer/component";
import { HermesProject } from "hermes/routes/authenticated/projects";

interface ProjectIndexComponentSignature {
  Args: {
    project: HermesProject;
  };
}

export default class ProjectIndexComponent extends Component<ProjectIndexComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    Project: typeof ProjectIndexComponent;
  }
}
