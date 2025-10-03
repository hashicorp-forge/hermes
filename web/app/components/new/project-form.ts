import { action } from "@ember/object";
import RouterService from "@ember/routing/router-service";
import { next } from "@ember/runloop";
import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { HermesDocument } from "hermes/types/document";
import { task } from "ember-concurrency";
import ConfigService from "hermes/services/config";
import FetchService from "hermes/services/fetch";
import HermesFlashMessagesService from "hermes/services/flash-messages";
import cleanString from "hermes/utils/clean-string";
import { JiraPickerResult } from "hermes/types/project";
// TEMPORARILY USING STUBS FOR EMBER 6.x UPGRADE
import { timeout } from "hermes/utils/ember-animated-stubs";
import Ember from "ember";

const TIMEOUT = Ember.testing ? 0 : 2000;

interface NewProjectFormComponentSignature {
  Args: {
    isModal?: boolean;
    document?: HermesDocument;
    onModalClose?: () => void;
  };
}

export default class NewProjectFormComponent extends Component<NewProjectFormComponentSignature> {
  @service("fetch") declare fetchSvc: FetchService;
  @service("config") declare configSvc: ConfigService;
  @service declare router: RouterService;
  @service declare flashMessages: HermesFlashMessagesService;

  /**
   * Whether the project is being created, or in the process of
   * transitioning to the project screen after successful creation.
   * Used by the `New::Form` component for conditional rendering.
   * Set true when the createProject task is running.
   * Reverted only if an error occurs.
   */
  @tracked protected projectIsBeingCreated = false;

  @tracked protected jiraIssue: JiraPickerResult | undefined = undefined;

  @tracked protected title: string = "";
  @tracked protected description: string = "";
  @tracked protected titleErrorIsShown = false;

  /**
   * Whether the Jira integration is enabled.
   * Determines whether the Jira input is rendered.
   */
  protected get jiraIsEnabled() {
    return !!this.configSvc.config.jira_url;
  }

  /**
   * The action run when a Jira issue is selected.
   * Passed to the JiraWidget as `onIssueSelect`.
   */
  @action protected setJiraIssue(issue: JiraPickerResult) {
    this.jiraIssue = issue;
  }

  /**
   * The action run when a Jira issue is removed.
   * Passed to the JiraWidget as `onIssueRemove`.
   */
  @action protected removeJiraIssue() {
    this.jiraIssue = undefined;
  }

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
      const projectPromise = this.fetchSvc
        .fetch(`/api/${this.configSvc.config.api_version}/projects`, {
          method: "POST",
          body: JSON.stringify({
            title: cleanString(this.title),
            description: cleanString(this.description),
            jiraIssueID: this.jiraIssue?.key,
          }),
        })
        .then((response) => response?.json());

      /**
       * Create the project with a minimum duration.
       * This allows us time to show a brief "creating..."
       * message to orient the user.
       */
      const [project] = await Promise.all([projectPromise, timeout(TIMEOUT)]);

      if (this.args.document) {
        await this.fetchSvc.fetch(
          `/api/${this.configSvc.config.api_version}/projects/${project.id}/related-resources`,
          {
            method: "POST",
            body: JSON.stringify({
              hermesDocuments: [
                {
                  googleFileID: this.args.document.objectID,
                  sortOrder: 1,
                },
              ],
            }),
          },
        );
      }

      this.router.transitionTo("authenticated.projects.project", project.id);
    } catch (e) {
      this.flashMessages.critical((e as any).message, {
        title: "Error creating project",
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
