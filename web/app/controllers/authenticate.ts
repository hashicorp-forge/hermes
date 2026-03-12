import Controller from "@ember/controller";
import { inject as service } from "@ember/service";
import type SessionService from "hermes/services/session";
import type ConfigService from "hermes/services/config";
import { dropTask } from "ember-concurrency";

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
      return;
    }

    if (!this.configSvc.config.skip_microsoft_auth) {
      // SharePoint/Microsoft auth is backend-managed. The Go middleware will
      // initiate the Microsoft login flow and handle the callback.
      window.location.href = "/authenticate?init=true";
      return;
    }

    console.error(
      "Microsoft authentication is not properly configured. Missing one of clientId, tenantId, redirectUri.",
    );
  });
}
declare module "@ember/controller" {
  interface Registry {
    authenticate: AuthenticateController;
  }
}
