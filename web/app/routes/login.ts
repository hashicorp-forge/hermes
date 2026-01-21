import Route from "@ember/routing/route";
import { service } from "@ember/service";
import type RouterService from "@ember/routing/router-service";
import type ConfigService from "hermes/services/config";

export default class LoginRoute extends Route {
  @service declare router: RouterService;
  @service("config") declare configSvc: ConfigService;

  beforeModel() {
    const authProvider = this.configSvc.config.auth_provider;

    // For Dex, redirect to the backend login endpoint
    if (authProvider === "dex") {
      // Save the current URL to redirect back after login
      const redirectAfterLogin = this.router.currentURL || "/dashboard";
      window.location.href = `/auth/login?redirect=${encodeURIComponent(redirectAfterLogin)}`;
      return;
    }

    // For other auth providers, redirect to their authentication routes
    if (authProvider === "google" || authProvider === "okta") {
      this.router.transitionTo("authenticate");
      return;
    }

    // If no auth provider, go to dashboard
    this.router.transitionTo("authenticated.dashboard");
  }
}
