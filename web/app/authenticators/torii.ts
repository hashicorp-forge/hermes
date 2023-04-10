// TODO: Add types
// @ts-ignore
import Torii from "ember-simple-auth/authenticators/torii";
import { inject as service } from "@ember/service";
import SessionService from "hermes/services/session";
import FetchService from "hermes/services/fetch";

export default class ToriiAuthenticator extends Torii {
  // TODO: Add types
  @service declare torii: unknown;
  @service declare session: SessionService;
  @service("fetch") declare fetchSvc: FetchService;

  async restore(_arguments: unknown) {
    let data;

    data = await super.restore(_arguments);


    /**
     * Try the restored credentials with the backend.
     * If the backend rejects the credentials, the error will bubble up
     * to the application route's error method, which invalidates the session.
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
