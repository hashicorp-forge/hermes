import Model, { attr } from "@ember-data/model";

export default class PersonModel extends Model {
  /**
   * The person's full name, e.g., "Jane Doe".
   */
  @attr declare name: string;

  /**
   * The person's first name, e.g., "Jane".
   */
  @attr declare firstName: string;

  /**
   * The person's email address, e.g., "jane.doe@hashicorp.com"
   */
  @attr declare email: string;

  /**
   * The person's profile picture URL.
   */
  @attr declare picture: string;
}
