import Controller from "@ember/controller";
import { inject as service } from "@ember/service";
import type SessionService from "hermes/services/session";
import { dropTask } from "ember-concurrency";
import config from "hermes/config/environment";

export default class AuthenticateController extends Controller {
  @service declare session: SessionService;

  protected get currentYear(): number {
    return new Date().getFullYear();
  }

  protected authenticate = dropTask(async () => {
    console.log("Authenticate button clicked");
    if (!(config.microsoft && config.microsoft.clientId && config.microsoft.tenantId && config.microsoft.redirectUri)) {
      console.error("Microsoft authentication is not properly configured. Missing one of clientId, tenantId, redirectUri.");
      return;
    }

    const { tenantId, clientId, redirectUri } = config.microsoft;
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: "openid profile email User.Read",
      response_mode: "query",
      state: `${Date.now()}`,
    });

    window.location.href = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
  });
}
declare module "@ember/controller" {
  interface Registry {
    authenticate: AuthenticateController;
  }
}
