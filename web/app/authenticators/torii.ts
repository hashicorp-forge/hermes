// @ts-ignore -- TODO: Add Types
import Torii from "ember-simple-auth/authenticators/torii";
import { inject as service } from "@ember/service";
import FetchService from "hermes/services/fetch";

export default class ToriiAuthenticator extends Torii {
  @service("fetch") declare fetchSvc: FetchService;

  // Appears unused, but necessary for the session service
  @service declare torii: unknown;

  async restore(_arguments: unknown) {
    const data = await super.restore(_arguments);
    /**
     * A rejecting promise indicates invalid session data and will result
     * in the session being invalidated or remaining unauthenticated.
     */
    await this.fetchSvc.fetch("/api/v1/me", {
      method: "HEAD",
      headers: {
        "Hermes-Google-Access-Token": data.access_token,
      },
    });

    return data;
  }
}
