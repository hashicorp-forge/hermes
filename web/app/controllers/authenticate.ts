import Controller from "@ember/controller";
import { service } from "@ember/service";
import SessionService from "hermes/services/session";
import ConfigService from "hermes/services/config";
import { dropTask } from "ember-concurrency";

export default class AuthenticateController extends Controller {
  @service declare session: SessionService;
  @service("config") declare configSvc: ConfigService;

  protected get currentYear(): number {
    return new Date().getFullYear();
  }

  protected get authProvider(): string {
    return this.configSvc.config.auth_provider || "google";
  }

  protected authenticate = dropTask(async () => {
    await this.session.authenticate(
      "authenticator:custom-auth",
      "google-oauth2-bearer"
    );
  });

  protected authenticateOIDC = dropTask(async () => {
    // For OIDC providers (Okta/Dex), redirect to the backend auth endpoint
    // which will handle the OIDC flow
    const authProvider = this.authProvider;
    window.location.href = `/api/v2/auth/${authProvider}/login`;
  });
}
declare module "@ember/controller" {
  interface Registry {
    authenticate: AuthenticateController;
  }
}
