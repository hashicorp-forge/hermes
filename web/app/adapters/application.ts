import JSONAdapter from "@ember-data/adapter/json-api";
import { inject as service } from "@ember/service";
import type ConfigService from "hermes/services/config";
import type FetchService from "hermes/services/fetch";
import type SessionService from "hermes/services/session";

export default class ApplicationAdapter extends JSONAdapter {
  @service("config") declare configSvc: ConfigService;
  @service("fetch") declare fetchSvc: FetchService;
  @service declare session: SessionService;

  get namespace() {
    return `api/${this.configSvc.config.api_version}`;
  }

  get headers() {
    if (!this.configSvc.config.skip_google_auth) {
      return {
        "Hermes-Google-Access-Token":
          this.session.data.authenticated.access_token,
      };
    }

    return {
      "Hermes-Access-Token": this.session.data.authenticated.access_token,
    };
  }
}
