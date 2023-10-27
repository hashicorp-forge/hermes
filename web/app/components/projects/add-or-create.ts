import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { HermesProject } from "hermes/types/project";
import { ProjectStatus } from "hermes/types/project-status";

interface ProjectsAddOrCreateSignature {
  Args: {
    onClose: () => void;
  };
}

export default class ProjectsAddOrCreate extends Component<ProjectsAddOrCreateSignature> {
  @tracked protected inputValue = "";

  get algoliaResults(): Record<string, HermesProject> {
    return {
      "1": {
        id: "1",
        title: "Create new project",
        creator: "test",
        dateCreated: 123,
        dateModified: 123,
        status: ProjectStatus.Active,
      },
      "2": {
        id: "2",
        title: "Hello",
        creator: "test",
        dateCreated: 123,
        dateModified: 123,
        status: ProjectStatus.Active,
      },
    };
  }

  @tracked protected searchIsRunning = false;
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Projects::AddOrCreate": typeof ProjectsAddOrCreate;
  }
}
