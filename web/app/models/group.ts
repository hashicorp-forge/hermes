import Model, { attr } from "@ember-data/model";

export default class GroupModel extends Model {
  /**
   * The person's full name, e.g., "Jane Doe".
   */
  @attr declare name: string;

  /**
   * The person's email address, e.g., "jane.doe@hashicorp.com"
   */
  @attr declare email: string;
}
