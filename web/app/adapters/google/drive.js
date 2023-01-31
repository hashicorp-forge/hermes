import RESTAdapter from "@ember-data/adapter/rest";
import { inject as service } from "@ember/service";

export default class GoogleDriveAdapter extends RESTAdapter {
  @service session;

  host = "https://www.googleapis.com/drive";
  namespace = "v3";

  get headers() {
    return {
      Authorization: "Bearer " + this.session.data.authenticated.access_token,
    };
  }
}
