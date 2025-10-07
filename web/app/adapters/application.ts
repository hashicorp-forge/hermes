import JSONAdapter from "@ember-data/adapter/json-api";
import { service } from "@ember/service";
import ConfigService from "hermes/services/config";
import FetchService from "hermes/services/fetch";
import SessionService from "hermes/services/session";

export default class ApplicationAdapter extends JSONAdapter {
  @service("config") declare configSvc: ConfigService;
  @service("fetch") declare fetchSvc: FetchService;
  @service declare session: SessionService;

  get namespace() {
    return `api/${this.configSvc.config.api_version}`;
  }

  get headers() {
    return {
      "Hermes-Google-Access-Token":
        this.session.data.authenticated.access_token,
    };
  }
}
