import Controller from "@ember/controller";
import { inject as service } from "@ember/service";
import type SessionService from "hermes/services/session";
import type ConfigService from "hermes/services/config";
import { dropTask } from "ember-concurrency";
import config from "hermes/config/environment";

export default class AuthenticateController extends Controller {
  @service declare session: SessionService;
  @service("config") declare configSvc: ConfigService;

  protected get currentYear(): number {
    return new Date().getFullYear();
  }

  get authButtonText(): string {
    return this.configSvc.config.skip_google_auth
      ? "Authenticate with Microsoft"
      : "Authenticate with Google";
  }

  get authButtonIcon(): string {
    return this.configSvc.config.skip_google_auth ? "microsoft" : "google";
  }

  protected authenticate = dropTask(async () => {
    if (!this.configSvc.config.skip_google_auth) {
      // Google OAuth flow via Torii.
      await this.session.authenticate(
        "authenticator:torii",
        "google-oauth2-bearer",
      );
    } else if (
      config.microsoft &&
      config.microsoft.clientId &&
      config.microsoft.tenantId &&
      config.microsoft.redirectUri
    ) {
      // Microsoft OAuth flow (SharePoint mode without ALB).
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
    }
  });
}
declare module "@ember/controller" {
  interface Registry {
    authenticate: AuthenticateController;
  }
}
