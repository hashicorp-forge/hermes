import { action } from "@ember/object";
import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { task } from "ember-concurrency";
import FetchService from "hermes/services/fetch";

interface NewProjectFormComponentSignature {
  Args: {};
}

export default class NewProjectFormComponent extends Component<NewProjectFormComponentSignature> {
  @service("fetch") declare fetchSvc: FetchService;

  @tracked protected title: string = "";
  @tracked protected description: string = "";

  @action maybeSubmitForm() {
    // TODO: validate
    this.createProject.perform();
  }

  private createProject = task(async () => {
    try {
      const project = await this.fetchSvc
        .fetch("/api/projects", {
          method: "POST",
          body: JSON.stringify({
            title: this.title,
            description: this.description,
          }),
        })
        .then((response) => response?.json());
    } catch (e: unknown) {
      // TODO: handle error
    }
  });
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "New::ProjectForm": typeof NewProjectFormComponent;
  }
}
