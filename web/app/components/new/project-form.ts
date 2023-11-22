import { action } from "@ember/object";
import RouterService from "@ember/routing/router-service";
import { next } from "@ember/runloop";
import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { HermesDocument } from "hermes/types/document";
import { restartableTask, task } from "ember-concurrency";
import ConfigService from "hermes/services/config";
import FetchService from "hermes/services/fetch";
import HermesFlashMessagesService from "hermes/services/flash-messages";
import { ProjectStatus } from "hermes/types/project-status";
import cleanString from "hermes/utils/clean-string";
import { JiraIssue } from "hermes/types/project";

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

  @tracked protected jiraSearchIsShowing = false;
  @tracked protected jiraSearchQuery = "";
  @tracked protected jiraIssue: JiraIssue | null = null;

  @tracked protected shownJiraIssues = [];

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

  private validate() {
    this.titleErrorIsShown = this.title.length === 0;
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

  @action protected showJiraSearch() {
    this.jiraSearchIsShowing = true;
  }

  @action protected hideJiraSearch() {
    this.jiraSearchIsShowing = false;
  }

  @action protected addJiraIssue(issue: JiraIssue) {
    // TODO: Add to project
    this.jiraIssue = issue;

    this.hideJiraSearch();
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

  @action protected updateJiraSearchQuery(eventOrValue: Event | string) {
    if (typeof eventOrValue === "string") {
      this.jiraSearchQuery = eventOrValue;
    } else {
      this.jiraSearchQuery = (eventOrValue.target as HTMLInputElement).value;
    }

    void this.searchJiraIssues.perform();
  }

  protected loadInitialJiraIssues = task(async () => {
    // TODO: Load initial Jira issues
  });

  protected searchJiraIssues = restartableTask(async () => {
    // TODO: Search Jira issues
  });

  /**
   * The task that creates a project and, if successful,
   * transitions to it. On error, displays a FlashMessage
   * and reverts the `projectIsBeingCreated` state.
   */
  private createProject = task(async () => {
    try {
      this.projectIsBeingCreated = true;
      const project = await this.fetchSvc
        .fetch(`/api/${this.configSvc.config.api_version}/projects`, {
          method: "POST",
          body: JSON.stringify({
            title: cleanString(this.title),
            description: cleanString(this.description),
            status: ProjectStatus.Active,
          }),
        })
        .then((response) => response?.json());

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
