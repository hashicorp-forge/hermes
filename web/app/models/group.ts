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

  /**
   * TODO
   */
  @attr declare description: string;

  /**
   * TODO
   */
  @attr declare directMembersCount: number;

  /**
   * TODO // Probably won't need
   */
  @attr declare adminCreated: boolean;

  /**
   * TODO // Probably won't need
   */
  @attr declare kind: string;

  /**
   * TODO // Probably won't need
   */
  @attr declare etag: string;

  /**
   * TODO // Probably won't need
   */
  @attr declare aliases: string[];

  /**
   * TODO // Probably won't need
   */
  @attr declare nonEditableAliases: string[];
}
