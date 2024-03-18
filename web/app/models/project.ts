import Model, { attr } from "@ember-data/model";
import { ProjectStatus } from "hermes/types/project-status";

export default class ProjectModel extends Model {
  /**
   *
   */
  @attr declare title: string;

  /**
   *
   */
  @attr declare status: ProjectStatus;

  /**
   *
   */
  @attr declare creator: string;

  /**
   *
   */
  @attr declare createdTime: number;

  /**
   *
   */
  @attr declare modifiedTime: number;

  /**
   *
   */
  @attr declare description?: string;

  /**
   *
   */
  @attr declare jiraIssueID?: string;

  /**
   *
   */
  @attr declare products?: string[];
}
