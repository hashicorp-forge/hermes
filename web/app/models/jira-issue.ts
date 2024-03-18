import Model, { attr } from "@ember-data/model";

export default class JiraIssueModel extends Model {
  /**
   * The Jira issue key, e.g., "PROJ-123".
   * Used as the ID for the JiraIssue model.
   */
  @attr declare key: string;

  /**
   * The summary of the issue.
   */
  @attr declare summary?: string;

  /**
   * The issue permalink.
   */
  @attr declare url: string;

  /**
   * The status, e.g., "Open".
   */
  @attr declare status: string;

  /**
   * The assignee of the issue.
   */
  @attr declare assignee?: string;

  /**
   * The type of issue, e.g., "Bug".
   */
  @attr declare issueType?: string;

  /**
   * The URL to the issue type image.
   * TODO: Host these ourselves to avoid broken images.
   */
  @attr declare issueTypeImage: string;

  /**
   * The issue priority, e.g., "High".
   */
  @attr declare priority?: string;

  /**
   * The URL to the priority image.
   * TODO: Host these ourselves to avoid broken images.
   */
  @attr declare priorityImage: string;
}
