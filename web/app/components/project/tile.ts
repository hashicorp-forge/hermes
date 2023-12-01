import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import FlagsService from "hermes/services/flags";
import { HermesProject } from "hermes/types/project";

interface ProjectTileComponentSignature {
  Element: HTMLDivElement;
  Args: {
    project: HermesProject;
  };
}

export default class ProjectTileComponent extends Component<ProjectTileComponentSignature> {
  @service declare flags: FlagsService;

  protected get productColorsAreEnabled(): boolean {
    return this.flags.productColors === true;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Project::Tile": typeof ProjectTileComponent;
  }
}
