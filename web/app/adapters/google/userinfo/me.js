import GoogleUserinfoAdapter from "../userinfo";

export default class GoogleUserinfoMeAdapter extends GoogleUserinfoAdapter {
  urlForQueryRecord(query, modelName) {
    let baseUrl = this.buildURL();
    return `${baseUrl}/me`;
  }
}
