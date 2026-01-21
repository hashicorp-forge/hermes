/**
 * Custom authenticator for Hermes multi-provider authentication.
 * Supports Google OAuth (via ember-simple-auth) and OIDC providers (Okta, Dex).
 * 
 * Note: This does NOT use the Torii library (removed in Ember 6.x upgrade).
 * Google OAuth uses ember-simple-auth directly, OIDC uses backend redirects.
 */
import Base from "ember-simple-auth/authenticators/base";
import { service } from "@ember/service";
import ConfigService from "hermes/services/config";
import FetchService from "hermes/services/fetch";

export default class CustomAuthAuthenticator extends Base {
  @service("config") declare configSvc: ConfigService;
  @service("fetch") declare fetchSvc: FetchService;

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
          "Hermes-Google-Access-Token": (data as { access_token: string }).access_token,
        },
      })
      .then(() => data);
  }
}
