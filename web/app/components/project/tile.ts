import { assert } from "@ember/debug";
import { service } from "@ember/service";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { task } from "ember-concurrency";
import JiraIssueModel from "hermes/models/jira-issue";
import ConfigService from "hermes/services/config";
import FetchService from "hermes/services/fetch";
import StoreService from "hermes/services/store";
import { HermesProject, HermesProjectHit } from "hermes/types/project";

export const PROJECT_TILE_MAX_PRODUCTS = 3;

interface ProjectTileComponentSignature {
  Element: HTMLDivElement;
  Args: {
    project: HermesProject | HermesProjectHit;
    /**
     * The search query, if any, that led to this project being shown.
     * Used to highlight the matching text in the title.
     */
    query?: string;
  };
}

export default class ProjectTileComponent extends Component<ProjectTileComponentSignature> {
  @service("fetch") declare fetchSvc: FetchService;
  @service("config") declare configSvc: ConfigService;
  @service declare store: StoreService;

  constructor(owner: unknown, args: ProjectTileComponentSignature["Args"]) {
    super(owner, args);

    if (args.project.jiraIssueID) {
      this.fetchJiraIssue.perform();
    }
  }

  /**
   * The maximum number of product avatars to show before
   * showing a "+N" label.
   */
  protected maxProducts = PROJECT_TILE_MAX_PRODUCTS;

  /**
   * The Jira issue associated with this project, if any.
   * Used in the template to determine whether to show Jira-related data.
   * Set by the `fetchJiraIssue` task if the project has a jiraIssueID.
   */
  @tracked protected jiraIssue: JiraIssueModel | null = null;

  /**
   * The project ID used as our LinkTo model.
   * If the project is an Algolia result, it has an `objectID`.
   * If the project is retrieved from the back-end, it has an `id`.
   */
  protected get projectID() {
    if ("objectID" in this.args.project) {
      return this.args.project.objectID;
    } else {
      return this.args.project.id;
    }
  }

  /**
   * Whether the "+N" label is shown next to the product avatars.
   * True if the number of unique products is greater than the max.
   */
  protected get additionalProductsLabelIsShown() {
    const { products } = this.args.project;
    return (products?.length ?? 0) > this.maxProducts;
  }

  /**
   * The number of additional products that are not shown in the product avatars.
   * Rendered if `additionalProductsLabelIsShown` is true.
   */
  protected get additionalProductsCount() {
    const { products } = this.args.project;
    return (products?.length ?? 0) - this.maxProducts;
  }

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
    assert("jiraIssueID must exist", this.args.project.jiraIssueID);

    const jiraIssue = await this.store.findRecord(
      "jira-issue",
      this.args.project.jiraIssueID,
    );

    this.jiraIssue = jiraIssue;
  });
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Project::Tile": typeof ProjectTileComponent;
  }
}
