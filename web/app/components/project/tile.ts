import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { task } from "ember-concurrency";
import ConfigService from "hermes/services/config";
import FetchService from "hermes/services/fetch";
import { HermesProject, JiraIssue } from "hermes/types/project";

interface ProjectTileComponentSignature {
  Element: HTMLDivElement;
  Args: {
    project: HermesProject;
  };
}

export default class ProjectTileComponent extends Component<ProjectTileComponentSignature> {
  @service("fetch") declare fetchSvc: FetchService;
  @service("config") declare configSvc: ConfigService;

  constructor(owner: unknown, args: ProjectTileComponentSignature["Args"]) {
    super(owner, args);

    if (args.project.jiraIssueID) {
      this.fetchJiraIssue.perform();
    }
  }

  /**
   * The Jira issue associated with this project, if any.
   * Used in the template to determine whether to show Jira-related data.
   * Set by the `fetchJiraIssue` task if the project has a jiraIssueID.
   */
  @tracked jiraIssue: JiraIssue | null = null;

  /**
   * Whether the Jira issue is marked "close" or "done."
   * Used to determine whether the key is shown with a line through it.
   */
  protected get jiraIssueIsClosed() {
    const status = this.jiraIssue?.status.toLowerCase();
    if (status?.includes("done") || status?.includes("closed")) {
      return true;
    }
  }

  /**
   * The task to fetch a JiraIssue from a jiraIssueID.
   * Called in the constructor if the project has a jiraIssueID.
   */
  protected fetchJiraIssue = task(async () => {
    const jiraIssue = await this.fetchSvc
      .fetch(`/jira/issues/${this.args.project.jiraIssueID}`)
      .then((resp) => resp?.json());

    this.jiraIssue = jiraIssue as JiraIssue;
  });
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Project::Tile": typeof ProjectTileComponent;
  }
}
