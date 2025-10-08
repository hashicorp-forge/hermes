import Route from "@ember/routing/route";
import { service } from "@ember/service";
import type RouterService from "@ember/routing/router-service";
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
  @service declare router: RouterService;

  async beforeModel(transition: any) {
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
     * For Dex, check the session cookie by making a request to /api/v2/me.
     * For Google/Okta, use the session service's requireAuthentication.
     */
    const authProvider = this.configSvc.config.auth_provider;
    if (authProvider === "dex") {
      // For Dex, check if user is authenticated by trying to access the ME endpoint
      // Use GET instead of HEAD so we can retrieve the user data
      try {
        const response = await fetch("/api/v2/me", {
          method: "GET",
          credentials: "include", // Include cookies
        });
        
        if (!response.ok) {
          // Not authenticated - redirect to backend login endpoint
          // Force full page reload to bypass Ember router and hit the backend proxy
          const redirectUrl = encodeURIComponent(window.location.pathname + window.location.search);
          window.location.href = `/auth/login?redirect=${redirectUrl}`;
          // Return a promise that never resolves to prevent route from continuing
          return new Promise(() => {});
        }
        // User is authenticated, continue
      } catch (error) {
        // Network error or other issue - redirect to login
        const redirectUrl = encodeURIComponent(window.location.pathname + window.location.search);
        const loginUrl = new URL("/auth/login", window.location.origin);
        loginUrl.searchParams.set("redirect", redirectUrl);
        window.location.replace(loginUrl.toString());
        return new Promise(() => {});
      }
    } else if (authProvider === "google" || authProvider === "okta") {
      this.session.requireAuthentication(transition, "authenticate");
    }
  }

  // Note: Only called if the session is authenticated in the front end
  async afterModel() {
    const authProvider = this.configSvc.config.auth_provider;

    /**
     * Load user info and product areas for authenticated users.
     * For Dex, this loads user data from the local workspace provider.
     * For Google and Okta, this loads user data from OIDC claims.
     * 
     * If the `loadInfo` task returns a 401, it will bubble up to the
     * application error method which invalidates the session
     * and redirects to the auth screen.
     */
    /**
     * Load user info and product areas in parallel for authenticated providers.
     */
    await Promise.all([
      this.authenticatedUser.loadInfo.perform(),
      this.productAreas.fetch.perform(),
    ]);

    /**
     * Kick off the task to poll for expired auth.
     * Note: For Dex, this may not be needed as sessions are managed via cookies.
     */
    if (authProvider !== "dex") {
      void this.session.pollForExpiredAuth.perform();
    }
  }
}
