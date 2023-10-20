import { action } from "@ember/object";
import RouterService from "@ember/routing/router-service";
import { next } from "@ember/runloop";
import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import FlashMessageService from "ember-cli-flash/services/flash-messages";
import { task, timeout } from "ember-concurrency";
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

  @tracked protected _formElement?: HTMLFormElement;

  @action maybeSubmitForm(event?: SubmitEvent) {
    if (event) {
      event.preventDefault();
    }

    this.validateForm();

    if (this.formIsValid) {
      void this.createProject.perform();
    }
  }

  @action protected registerForm(element: HTMLFormElement) {
    this._formElement = element;
  }

  private validateForm() {
    this.errorIsShown = this.title.length === 0;
    this.formIsValid = this.title.length > 0;
  }

  @action protected onKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      // Replace newline function with submit action
      e.preventDefault();
      this.maybeSubmitForm();
    }
    if (this.errorIsShown) {
      // Validate once the input value are captured
      next("afterRender", () => {
        this.validateForm();
      });
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
    } catch (error: unknown) {
      const typedError = error as Error;

      this.flashMessages.add({
        title: "Error creating project",
        message: typedError.message,
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
