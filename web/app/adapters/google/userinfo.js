import RESTAdapter from "@ember-data/adapter/rest";
import { inject as service } from "@ember/service";

export default class GoogleUserinfoAdapter extends RESTAdapter {
  @service session;

  host = "https://www.googleapis.com/userinfo";
  namespace = "v2";

  get headers() {
    return {
      Authorization: "Bearer " + this.session.data.authenticated.access_token,
    };
  }
}
