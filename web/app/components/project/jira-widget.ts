import { action } from "@ember/object";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { service } from "@ember/service";
import { restartableTask } from "ember-concurrency";
import FetchService from "hermes/services/fetch";
import { JiraPickerResult } from "hermes/types/project";
import ConfigService from "hermes/services/config";
import { XDropdownListAnchorAPI } from "../x/dropdown-list";
import { next } from "@ember/runloop";
import { assert } from "@ember/debug";
import JiraIssueModel from "hermes/models/jira-issue";

interface ProjectJiraWidgetComponentSignature {
  Element: HTMLDivElement;
  Args: {
    issue?: JiraPickerResult | JiraIssueModel;
    onIssueSelect?: (issue: any) => void;
    onIssueRemove?: () => void;
    isDisabled?: boolean;
    isLoading?: boolean;
    isReadOnly?: boolean;
    /**
     * Whether the component is being used in a form context.
     * If true, removes the leading Jira icon and shows the input, autofocused,
     * with specific placeholder text and styles.
     */
    isNewProjectForm?: boolean;
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

  /**
   * Whether the plus icon should have an animated class.
   * Initially false so it doesn't animate on first render.
   * Set true once the input is shown, to be animated on
   * subsequent renders.
   */
  @tracked protected plusIconShouldAnimate = false;

  /**
   * An assert-true getter for the dropdown interface.
   * Asserts that the dropdown exists before returning it.
   */
  protected get dd(): XDropdownListAnchorAPI {
    assert("dropdown must exist", this._dd);
    return this._dd;
  }

  /**
   * Whether the search input is shown.
   * True if the context is a form, or if the
   * "Add Jira issue" button has been clicked.
   */
  protected get inputIsShown() {
    return this.args.isNewProjectForm || this._inputIsShown;
  }

  /**
   * The issue to display in the widget, if any.
   * If the issue is passed as an argument, such as when
   * a project with an issue is loaded, use that.
   * Otherwise, use the picked issue.
   */
  protected get issue() {
    return this.args.issue || this._issue;
  }

  /**
   * The status of the issue, if it exists.
   * Will exist if the issue is a full Jira issue.
   * Determines if the status is shown in the widget.
   */
  protected get issueStatus() {
    if (this.issue && "status" in this.issue) {
      return this.issue.status as string;
    }
  }

  /**
   * The type of the issue, if it exists.
   * Will exist if the issue is a full Jira issue.
   * Determines if the type is shown in the widget.
   */
  protected get issueType() {
    if (this.issue && "issueType" in this.issue) {
      return this.issue.issueType;
    }
  }

  /**
   * The URL to the issue type image, if it exists.
   * Will exist if the issue is a full Jira issue.
   * Determines if the type image is shown in the widget.
   */
  protected get issueTypeImage() {
    if (this.issue && "issueTypeImage" in this.issue) {
      return this.issue.issueTypeImage;
    }
  }

  /**
   * The priority of the issue, if it exists.
   * May exist if the issue is a full Jira issue.
   * Determines if the priority is shown in the widget.
   */
  protected get issuePriority() {
    if (this.issue && "priority" in this.issue) {
      return this.issue.priority as string;
    }
  }

  /**
   * The URL to the issue priority image, if it exists.
   * May exist if the issue is a full Jira issue.
   * Determines if the priority image is shown in the widget.
   */
  protected get issuePriorityImage() {
    if (this.issue && "priorityImage" in this.issue) {
      return this.issue.priorityImage as string;
    }
  }

  /**
   * The title of the issue, if it exists.
   * May exist if the issue is a full Jira issue.
   * Determines if an assignee is shown.
   */
  protected get issueAssignee() {
    if (this.issue && "assignee" in this.issue) {
      return this.issue.assignee as string;
    }
  }

  /**
   * The URL to the issue assignee's avatar, if it exists.
   * May exist if the issue is a full Jira issue.
   */
  protected get assigneeAvatar() {
    if (this.issue && "assigneeAvatar" in this.issue) {
      return this.issue.assigneeAvatar as string;
    }
  }

  /**
   * The URL to the Jira workspace.
   * Used to preface various image URLs.
   */
  protected get jiraWorkspaceURL() {
    return this.configSvc.config.jira_url;
  }

  /**
   * The action to run when an issue is selected.
   * Sets the local issue and runs the passed action.
   */
  @action onIssueSelect(_index: number, issue: JiraPickerResult) {
    this._issue = issue;
    this.args.onIssueSelect?.(issue);
  }

  /**
   * The action to run when the dropdown is closed.
   * Clears the query and results.
   */
  @action onDropdownClose() {
    this.results = [];
    this.query = "";
  }

  /**
   * The action to register the dropdown interface locally
   * for easy use in the component.
   */
  @action registerDropdown(dd: XDropdownListAnchorAPI) {
    this._dd = dd;
  }

  /**
   * The action to show the search input.
   * Runs when the "Add Jira issue" button is clicked.
   */
  @action protected showInput() {
    this._inputIsShown = true;
    this.plusIconShouldAnimate = true;
  }

  /**
   * The action to hide the search input.
   * Runs on `focusout` of the search input.
   */
  @action protected hideInput() {
    this._inputIsShown = false;
  }

  /**
   * The action run when the search input is typed in.
   * Updates the local query value and runs the search task.
   * If the query is empty, hides the dropdown.
   */
  @action onInput(event: Event) {
    this.query = (event.target as HTMLInputElement).value;

    if (this.query.length === 0) {
      this.dd.hideContent();
      return;
    }
    void this.searchJiraIssues.perform();
  }
  /**
   * The action to remove the issue from the widget.
   * Resets the local issue and runs `onIssueRemove` if it exists.
   */
  @action removeIssue() {
    this._issue = null;
    this.args.onIssueRemove?.();
  }
  /**
   * The task to search the Jira picker. Restarts on every input change.
   * Sends a request with the current query and sets the results to
   * the response. Shows the dropdown and runs dropdown functions to
   * assign menu item IDs and reset the focused item index.
   */
  searchJiraIssues = restartableTask(async () => {
    const issues = await this.fetchSvc
      .fetch(
        `/api/${this.configSvc.config.api_version}/jira/issue/picker?query=${this.query}`,
      )
      .then((response) => response?.json());

    this.results = issues;

    this.dd.showContent();

    this.dd.resetFocusedItemIndex();

    next(() => {
      this.dd.scheduleAssignMenuItemIDs();
    });
  });
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Project::JiraWidget": typeof ProjectJiraWidgetComponent;
  }
}
