import Component from "@glimmer/component";
import { HermesProject } from "hermes/types/project";

interface ProjectTileComponentSignature {
  Element: HTMLDivElement;
  Args: {
    project: HermesProject;
  };
}

export default class ProjectTileComponent extends Component<ProjectTileComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Project::Tile": typeof ProjectTileComponent;
  }
}
