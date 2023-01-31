import Model, { attr } from "@ember-data/model";

export default class GoogleUserinfoMeModel extends Model {
  @attr("string") email;
  @attr("string") given_name;
  @attr("string") name;
  @attr("string") picture;
}
