import { action } from "@ember/object";
import RouterService from "@ember/routing/router-service";
import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import FlashMessageService from "ember-cli-flash/services/flash-messages";
import { task } from "ember-concurrency";
import FetchService from "hermes/services/fetch";
import cleanString from "hermes/utils/clean-string";

interface NewProjectFormComponentSignature {
  Args: {};
}

export default class NewProjectFormComponent extends Component<NewProjectFormComponentSignature> {
  @service("fetch") declare fetchSvc: FetchService;
  @service declare router: RouterService;
  @service declare flashMessages: FlashMessageService;

  @tracked protected title: string = "";
  @tracked protected description: string = "";

  @tracked protected formIsValid = false;
  @tracked protected errorIsShown = false;

  @action maybeSubmitForm() {
    this.validateForm();

    if (this.formIsValid) {
      this.createProject.perform();
    }
  }

  private validateForm() {
    if (this.title.length === 0) {
      this.errorIsShown = true;
      this.formIsValid = false;
      return;
    }

    this.errorIsShown = false;
    this.formIsValid = true;
  }

  @action protected onKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      this.maybeSubmitForm();
    }
  }

  @action protected onKeyup() {
    if (this.errorIsShown) {
      this.validateForm();
    }
  }

  private createProject = task(async () => {
    try {
      const project = await this.fetchSvc
        .fetch("/api/v1/projects", {
          method: "POST",
          body: JSON.stringify({
            title: cleanString(this.title),
            description: cleanString(this.description),
          }),
        })
        .then((response) => response?.json());
      this.router.transitionTo("authenticated.projects.project", project.id);
    } catch (e: unknown) {
      const error = e as Error;

      this.flashMessages.add({
        title: "Error creating project",
        message: error.message,
        type: "critical",
        timeout: 6000,
        extendedTimeout: 1000,
      });
    }
  });
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "New::ProjectForm": typeof NewProjectFormComponent;
  }
}
