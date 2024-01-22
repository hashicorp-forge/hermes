import Model, { attr } from "@ember-data/model";

export default class PersonModel extends Model {
  @attr declare name: string;
  @attr declare firstName: string;
  @attr declare email: string;
  @attr declare picture: string;
}
