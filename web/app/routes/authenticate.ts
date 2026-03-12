import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import type ConfigService from "hermes/services/config";
import type RouterService from "@ember/routing/router-service";
import type SessionService from "hermes/services/session";

export default class AuthenticateRoute extends Route {
  @service("config") declare configSvc: ConfigService;
  @service declare router: RouterService;
  @service declare session: SessionService;

  async beforeModel() {
    /**
     * If both Google and Microsoft auth are skipped, it means external auth
     * (OIDC ALB, Okta) handles authentication — skip this route.
     * - Google mode: skip_google=false → DON'T skip (show Google login)
     * - OIDC/Okta mode: skip_google=true, skip_ms=true → SKIP
     * - SharePoint+ALB: skip_google=true, skip_ms=true → SKIP
     * - SharePoint-no-ALB: skip_google=true, skip_ms=false → DON'T skip (show MS login)
     */
    if (
      this.configSvc.config.skip_google_auth &&
      this.configSvc.config.skip_microsoft_auth
    ) {
      this.router.replaceWith("/");
      return;
    }

    /**
     * Checks if the session is authenticated,
     * and if it is, transitions to the specified route.
     * If it's not, the route will render normally.
     */
    this.session.prohibitAuthentication("/");
  }

  async model() {
    // In SharePoint mode, authentication is backend-managed via secure cookies.
    // If a valid backend session exists, establish the frontend session and
    // continue to the app.
    if (
      this.configSvc.config.skip_google_auth &&
      !this.configSvc.config.skip_microsoft_auth
    ) {
      try {
        await this.session.authenticate("authenticator:cookie");
        this.router.replaceWith("/");
        return;
      } catch (error) {
        // No backend session yet. Allow the route to render normally.
      }
    }
  }
}
