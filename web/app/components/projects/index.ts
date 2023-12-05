import Component from "@glimmer/component";
import { HermesProjectInfo } from "hermes/types/project";
import {
  ProjectStatus,
  projectStatusObjects,
} from "hermes/types/project-status";

interface ProjectsIndexComponentSignature {
  Element: null;
  Args: {
    projects: HermesProjectInfo[];
    status: ProjectStatus;
  };
  Blocks: {
    default: [];
  };
}

export default class ProjectsIndexComponent extends Component<ProjectsIndexComponentSignature> {
  protected get statuses() {
    return [
      {
        value: ProjectStatus.Active,
        label: projectStatusObjects[ProjectStatus.Active].label,
      },
      {
        value: ProjectStatus.Completed,
        label: projectStatusObjects[ProjectStatus.Completed].label,
      },
      {
        value: ProjectStatus.Archived,
        label: projectStatusObjects[ProjectStatus.Archived].label,
      },
    ];
  }

  protected get shownProjects() {
    return this.args.projects.filter(
      (project) => project.status === this.args.status,
    );
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    Projects: typeof ProjectsIndexComponent;
  }
}
