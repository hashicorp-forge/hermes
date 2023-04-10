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
    // this gets called as soon as any changes are made to the
    console.log("restore");
    let data;
    try {
      data = await super.restore(_arguments);
    } catch (e) {
      super.invalidate();
      // this.session.invalidate();
    }

    try {
      let resp = await this.fetchSvc.fetch("/api/v1/me", {
        method: "HEAD",
        headers: {
          "Hermes-Google-Access-Token": data.access_token,
        },
      });
      if (!resp?.ok) {
        super.invalidate();
      } else {
        return data;
      }
    } catch (e) {
      console.log("restore error", e);
      this.session.invalidate();
    }
  }
}
// restore(data: Data): Promise<unknown>;
// authenticate(...args: unknown[]): Promise<unknown>;
// invalidate(data: Data, ...args: unknown[]): Promise<unknown>;
