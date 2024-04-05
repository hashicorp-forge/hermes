import Model, { attr } from "@ember-data/model";

export default class GroupModel extends Model {
  /**
   * The name of the group, e.g., "Team Hermes"
   */
  @attr declare name: string;

  /**
   * The group's email address, e.g., "team-hermes@hashicorp.com"
   */
  @attr declare email: string;
}
