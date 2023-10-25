import { action } from "@ember/object";
import RouterService from "@ember/routing/router-service";
import { next } from "@ember/runloop";
import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import FlashMessageService from "ember-cli-flash/services/flash-messages";
import { task } from "ember-concurrency";
import FetchService from "hermes/services/fetch";
import cleanString from "hermes/utils/clean-string";

interface NewProjectFormComponentSignature {}

export default class NewProjectFormComponent extends Component<NewProjectFormComponentSignature> {
  @service("fetch") declare fetchSvc: FetchService;
  @service declare router: RouterService;
  @service declare flashMessages: FlashMessageService;

  /**
   * Whether the project is being created, or in the process of
   * transitioning to the project screen after successful creation.
   * Used by the `New::Form` component for conditional rendering.
   * Set true when the createProject task is running.
   * Reverted only if an error occurs.
   */
  @tracked protected projectIsBeingCreated = false;

  @tracked protected title: string = "";
  @tracked protected description: string = "";
  @tracked protected titleErrorIsShown = false;

  /**
   * The action to attempt a form submission.
   * If the form is valid, the createProject task is run.
   */
  @action maybeSubmitForm(event?: SubmitEvent) {
    event?.preventDefault();
    this.validate();

    if (!this.titleErrorIsShown) {
      void this.createProject.perform();
    }
  }

  private validate() {
    this.titleErrorIsShown = this.title.length === 0;
  }

  /**
   * The action run on title- and description-input keydown.
   * If the key is Enter, a form submission is attempted.
   * If the title error is shown, validation is run eagerly.
   */
  @action protected onKeydown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault();
      this.maybeSubmitForm();
    }
    if (this.titleErrorIsShown) {
      // Validate once the input values are captured
      next("afterRender", () => {
        this.validate();
      });
    }
  }

  /**
   * The task that creates a project and, if successful,
   * transitions to it. On error, displays a FlashMessage
   * and reverts the `projectIsBeingCreated` state.
   */
  private createProject = task(async () => {
    try {
      this.projectIsBeingCreated = true;
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
      this.projectIsBeingCreated = false;
    }
  });
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "New::ProjectForm": typeof NewProjectFormComponent;
  }
}
