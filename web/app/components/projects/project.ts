import Component from "@glimmer/component";
import { HermesProject } from "hermes/routes/authenticated/projects";

interface AllProjectsProjectComponentSignature {
  Args: {
    project: HermesProject;
  };
}

export default class AllProjectsProjectComponent extends Component<AllProjectsProjectComponentSignature> {
  protected get documents() {
    return this.args.project.documents;
  }

  protected get jiraObject() {
    return this.args.project.jiraObject;
  }

  protected get productAreas() {
    return this.documents?.map((doc) => doc.product).uniq();
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "All::Projects::Project": typeof AllProjectsProjectComponent;
  }
}
