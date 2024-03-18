import Model, { attr } from "@ember-data/model";

export default class JiraIssueModel extends Model {
  /**
   *
   */
  @attr declare key: string;

  /**
   *
   */
  @attr declare summary: string;

  /**
   *
   */
  @attr declare url: string;

  /**
   *
   */
  @attr declare status: string;

  /**
   *
   */
  @attr declare assignee: string;

  /**
   *
   */
  @attr declare issueType: string;

  /**
   *
   */
  @attr declare issueTypeImage: string;

  /**
   *
   */
  @attr declare priority: string;

  /**
   *
   */
  @attr declare priorityImage: string;
}
