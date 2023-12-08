import { action } from "@ember/object";
import RouterService from "@ember/routing/router-service";
import { next } from "@ember/runloop";
import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { restartableTask, task } from "ember-concurrency";
import ConfigService from "hermes/services/config";
import FetchService from "hermes/services/fetch";
import HermesFlashMessagesService from "hermes/services/flash-messages";
import cleanString from "hermes/utils/clean-string";
import { XDropdownListAnchorAPI } from "../x/dropdown-list";
import { assert } from "@ember/debug";
import { JiraPickerResult } from "hermes/types/project";

interface NewProjectFormComponentSignature {}

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

  @tracked protected title: string = "";
  @tracked protected description: string = "";
  @tracked protected titleErrorIsShown = false;

  @tracked protected jiraIssues = [];
  @tracked protected jiraQuery = "";

  @tracked protected jiraIssue: JiraPickerResult | null = null;

  @tracked protected dd: XDropdownListAnchorAPI | null = null;

  @action protected setJiraIssue(_index: number, attrs: JiraPickerResult) {
    console.log("attrs", attrs);
    this.jiraIssue = attrs;
  }

  @action protected onJiraDropdownClose() {
    this.jiraIssues = [];
    this.jiraQuery = "";
    this.dd = null;
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

  @action protected registerDD(dd: XDropdownListAnchorAPI) {
    this.dd = dd;
  }

  @action protected onJiraInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;

    this.jiraQuery = value;

    void this.searchJiraIssues.perform();
  }

  searchJiraIssues = restartableTask(async () => {
    const issues = await this.fetchSvc
      .fetch(
        `/api/${this.configSvc.config.api_version}/jira/issue/picker?currentJQL=""&query=${this.jiraQuery}`,
      )
      .then((response) => response?.json());

    this.jiraIssues = issues;

    const { dd } = this;

    if (dd) {
      dd.resetFocusedItemIndex();

      next(() => {
        dd.scheduleAssignMenuItemIDs();
      });
    }
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
