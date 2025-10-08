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
    // For Dex authentication, we don't need to send an access token
    // (authentication is handled via session cookies)
    const accessToken = this.session.data?.authenticated?.access_token;
    
    if (!accessToken) {
      return {};
    }
    
    return {
      "Hermes-Google-Access-Token": accessToken,
    };
  }
}
