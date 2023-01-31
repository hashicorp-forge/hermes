import GoogleDriveAdapter from "../drive";

export default class GoogleDriveFileAdapter extends GoogleDriveAdapter {
  urlForQuery(query, modelName) {
    let baseUrl = this.buildURL();
    return `${baseUrl}/files`;
  }
}
