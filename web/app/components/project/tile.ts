import Component from "@glimmer/component";
import { HermesProject } from "hermes/routes/authenticated/projects";

interface ProjectTileComponentSignature {
  Args: {
    project: HermesProject;
  };
}

export default class ProjectTileComponent extends Component<ProjectTileComponentSignature> {
  protected get documents() {
    return this.args.project.documents;
  }

  protected get jiraObject() {
    return this.args.project.jiraObject;
  }

  protected get productAreas() {
    // @ts-ignore
    return this.documents?.map((doc) => doc.product).uniq();
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Project::Tile": typeof ProjectTileComponent;
  }
}
