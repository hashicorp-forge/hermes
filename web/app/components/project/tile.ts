import { inject as service } from "@ember/service";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { task, timeout } from "ember-concurrency";
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

  @tracked jiraIssue: JiraIssue | null = null;

  protected get jiraIssueIsClosed() {
    const status = this.jiraIssue?.status.toLowerCase();
    if (status?.includes("done") || status?.includes("closed")) {
      return true;
    }
  }

  protected fetchJiraIssue = task(async () => {
    try {
      const jiraIssue = await this.fetchSvc
        .fetch(
          `/api/${this.configSvc.config.api_version}/jira/issues/${this.args.project.jiraIssueID}`,
        )
        .then((resp) => resp?.json());

      this.jiraIssue = jiraIssue as JiraIssue;
    } catch (e) {}
  });
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Project::Tile": typeof ProjectTileComponent;
  }
}
