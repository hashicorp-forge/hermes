import Route from "@ember/routing/route";
import { service } from "@ember/service";
import AuthenticatedController from "hermes/controllers/authenticated";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import ConfigService from "hermes/services/config";
import ProductAreasService from "hermes/services/product-areas";
import SessionService from "hermes/services/session";

export default class AuthenticatedRoute extends Route {
  @service("config") declare configSvc: ConfigService;
  @service declare session: SessionService;
  @service declare authenticatedUser: AuthenticatedUserService;
  @service declare productAreas: ProductAreasService;

  beforeModel(transition: any) {
    /**
     * If the user is dry-loading the results route with a query,
     * we capture the query on our controller and pass it to the search input.
     */
    const { to } = transition;
    const query = to.queryParams["q"];

    if (query && to.name.includes("results")) {
      (this.controllerFor("authenticated") as AuthenticatedController).set(
        "query",
        query,
      );
    }

    /**
     * Check if the session is authenticated based on the auth provider.
     * If unauthenticated, it will redirect to the auth screen.
     * Note: Dex authentication is currently not fully implemented in the frontend,
     * so we skip authentication requirement for Dex (backend has web endpoints as unauthenticated).
     * Once OIDC authorization code flow is implemented, add "dex" back to this list.
     */
    const authProvider = this.configSvc.config.auth_provider;
    if (authProvider === "google" || authProvider === "okta") {
      this.session.requireAuthentication(transition, "authenticate");
    }
  }

  // Note: Only called if the session is authenticated in the front end
  async afterModel() {
    const authProvider = this.configSvc.config.auth_provider;

    /**
     * For Dex, skip loading user info and product areas since the backend
     * doesn't have OIDC authorization code flow endpoints yet. The backend
     * serves web endpoints as unauthenticated when using Dex, which causes
     * API endpoints to return HTML instead of JSON.
     * 
     * For Google and Okta, check if the session is authenticated in the back end.
     * If the `loadInfo` task returns a 401, it will bubble up to the
     * application error method which invalidates the session
     * and redirects to the auth screen.
     */
    if (authProvider !== "dex") {
      /**
       * Load user info and product areas in parallel for authenticated providers.
       */
      await Promise.all([
        this.authenticatedUser.loadInfo.perform(),
        this.productAreas.fetch.perform(),
      ]);

      /**
       * Kick off the task to poll for expired auth.
       */
      void this.session.pollForExpiredAuth.perform();
    }
  }
}
