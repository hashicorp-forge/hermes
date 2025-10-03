// TEMPORARILY DISABLED FOR EMBER 6.x UPGRADE
// @ts-ignore -- TODO: Add Types
// import Torii from "ember-simple-auth/authenticators/torii";
import { Base } from "ember-simple-auth/authenticators/base";
import { inject as service } from "@ember/service";
import ConfigService from "hermes/services/config";
import FetchService from "hermes/services/fetch";

export default class ToriiAuthenticator extends Base {
  @service("config") declare configSvc: ConfigService;
  @service("fetch") declare fetchSvc: FetchService;

  // Appears unused, but necessary for the session service
  @service declare torii: unknown;

  async restore() {
    const data = await super.restore(...arguments);
    /**
     * A rejecting promise indicates invalid session data and will result
     * in the session being invalidated or remaining unauthenticated.
     */
    return this.fetchSvc
      .fetch(`/api/${this.configSvc.config.api_version}/me`, {
        method: "HEAD",
        headers: {
          "Hermes-Google-Access-Token": data.access_token,
        },
      })
      .then(() => data);
  }
}
