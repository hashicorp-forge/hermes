import Component from "@glimmer/component";
import { HermesProject } from "hermes/types/project";

interface ProjectTileComponentSignature {
  Element: HTMLDivElement;
  Args: {
    project: HermesProject;
  };
}

export default class ProjectTileComponent extends Component<ProjectTileComponentSignature> {
  private get documents() {
    // return this.args.project.hermesDocuments;
    return;
  }

  protected get jiraObject() {
    // return this.args.project.jiraObject;
    return;
  }

  protected get productAreas() {
    // return this.documents?.map((doc) => doc.product).uniq();
    return;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Project::Tile": typeof ProjectTileComponent;
  }
}
