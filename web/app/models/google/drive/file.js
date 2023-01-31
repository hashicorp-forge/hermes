import Model, { attr } from "@ember-data/model";

export default class GoogleDriveFileModel extends Model {
  @attr("string") createdTime;
  @attr lastModifyingUser;
  @attr("string") modifiedTime;
  @attr("boolean") ownedByMe;
  @attr owners;
  @attr("string") name;
  @attr("string") thumbnailLink;
}
