import { action } from "@ember/object";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { inject as service } from "@ember/service";
import { restartableTask } from "ember-concurrency";
import FetchService from "hermes/services/fetch";
import { JiraIssue, JiraPickerResult } from "hermes/types/project";
import ConfigService from "hermes/services/config";
import { XDropdownListAnchorAPI } from "../x/dropdown-list";
import { next } from "@ember/runloop";

interface ProjectJiraWidgetComponentSignature {
  Element: HTMLDivElement;
  Args: {
    // if this is passed in, we show the issue rather than the button
    issue?: JiraPickerResult | JiraIssue | string;

    // what to do when the issue is selected, e.g., call a save action.
    onIssueSelect?: (issue: any) => void;

    // what to do when the user removes the issue
    onIssueRemove?: () => void;

    isDisabled?: boolean;

    isSaving?: boolean;

    isCompact?: boolean;

    isLoading?: boolean;

    // maybe some saving/loading states?
  };
}

export default class ProjectJiraWidgetComponent extends Component<ProjectJiraWidgetComponentSignature> {
  @service("fetch") declare fetchSvc: FetchService;
  @service("config") declare configSvc: ConfigService;

  @tracked private _issue: JiraPickerResult | null = null;
  @tracked private _dd: XDropdownListAnchorAPI | null = null;

  @tracked protected query = "";
  @tracked protected results: JiraPickerResult[] = [];

  @tracked protected _inputIsShown = false;
  @tracked protected dropdownIsShown = false;

  protected get inputIsShown() {
    return this.args.isCompact ?? this._inputIsShown;
  }

  protected get issue() {
    if (typeof this.args.issue === "string" && this.args.issue.length > 0) {
      // FOR NOW....
      return { key: this.args.issue };
    }
    return this.args.issue || this._issue;
  }

  protected get issueStatus() {
    if (
      this.issue &&
      typeof this.issue === "object" &&
      "status" in this.issue
    ) {
      return this.issue.status;
    }
  }

  @action onIssueSelect(_index: number, issue: JiraPickerResult) {
    this._issue = issue;
    this.args.onIssueSelect?.(issue);
  }

  @action onDropdownClose() {
    this.results = [];
    this.query = "";
  }

  @action registerDropdown(dd: XDropdownListAnchorAPI) {
    this._dd = dd;
  }

  @action protected showInput() {
    this._inputIsShown = true;
  }

  @action protected hideInput() {
    this._inputIsShown = false;
  }

  @action onInput(event: Event) {
    this.query = (event.target as HTMLInputElement).value;
    console.log("THE QUERY IS....", this.query);
    if (this.query.length === 0) {
      this._dd?.hideContent();
      return;
    }
    void this.searchJiraIssues.perform();
  }

  @action removeIssue() {
    this._issue = null;
    this.args.onIssueRemove?.();
  }

  searchJiraIssues = restartableTask(async () => {
    const issues = await this.fetchSvc
      .fetch(
        `/api/${this.configSvc.config.api_version}/jira/issue/picker?currentJQL=""&query=${this.query}`,
      )
      .then((response) => response?.json());

    this.results = issues;

    this._dd?.showContent();

    this._dd?.resetFocusedItemIndex();

    next(() => {
      this._dd?.scheduleAssignMenuItemIDs();
    });
  });
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Project::JiraWidget": typeof ProjectJiraWidgetComponent;
  }
}
