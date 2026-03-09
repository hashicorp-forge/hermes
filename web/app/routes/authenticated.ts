import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import type AuthenticatedController from "hermes/controllers/authenticated";
import type AuthenticatedUserService from "hermes/services/authenticated-user";
import type ConfigService from "hermes/services/config";
import type ProductAreasService from "hermes/services/product-areas";
import type SessionService from "hermes/services/session";

export default class AuthenticatedRoute extends Route {
  @service("config") declare configSvc: ConfigService;
  @service declare session: SessionService;
  @service declare authenticatedUser: AuthenticatedUserService;
  @service declare productAreas: ProductAreasService;

  beforeModel(transition: any) {
    const { to } = transition;
    const query = to.queryParams["q"];

    if (query && to.name.includes("results")) {
      (this.controllerFor("authenticated") as AuthenticatedController).set(
        "query",
        query,
      );
    }

    if (!this.configSvc.config.skip_microsoft_auth) {
      // ESA 7.x - requireAuthentication works correctly
      this.session.requireAuthentication(transition, "authenticate");
    }
  }

  async afterModel() {
    try {
      const loadInfoPromise = this.authenticatedUser.loadInfo.perform();

      const loadProductAreasPromise = this.productAreas.fetch.perform();

      await Promise.all([loadInfoPromise, loadProductAreasPromise]);

      void this.session.pollForExpiredAuth.perform();

      // Check if we're in an Office Dialog and notify parent add-in
      this.notifyOfficeDialogIfPresent();
    } catch (error) {
      throw error;
    }

    void this.session.pollForExpiredAuth.perform();
  }

  /**
   * If the app is running inside an Office Dialog (opened by the add-in),
   * send a message to the parent to signal that authentication is complete.
   */
  private notifyOfficeDialogIfPresent(): void {
    try {
      // Check if we're in a popup/dialog context (opened for auth)
      const urlParams = new URLSearchParams(window.location.search);
      const isPopupAuth = urlParams.get('popup') === 'true';

      if (!isPopupAuth) {
        return;
      }

      // Check if Office.js is available (we're in an Office Dialog)
      // Use window.Office since Office global may not be defined
      const officeContext = (window as any).Office;
      if (officeContext && officeContext.context && officeContext.context.ui) {
        console.log("AuthenticatedRoute: Sending message to Office parent");
        officeContext.context.ui.messageParent(JSON.stringify({
          type: 'AUTH_COMPLETE',
          success: true,
          email: this.authenticatedUser.info?.email || 'authenticated'
        }));
      } else {
        if (window.opener) {
          window.opener.postMessage({
            type: 'AUTH_COMPLETE',
            success: true,
            email: this.authenticatedUser.info?.email || 'authenticated'
          }, window.location.origin);
        }
      }
    } catch (error) {
      console.error("AuthenticatedRoute: Error notifying Office dialog:", error);
    }
  }
}
