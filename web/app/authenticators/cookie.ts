import { inject as service } from "@ember/service";
// @ts-ignore
import BaseAuthenticator from "ember-simple-auth/authenticators/base";
import type ConfigService from "hermes/services/config";
import type FetchService from "hermes/services/fetch";

/**
 * Cookie-based authenticator for backend-managed authentication.
 * 
 * This app uses backend (Go server) managed authentication via HTTP-only cookies.
 * The backend handles the entire Microsoft OAuth flow and sets secure cookies.
 * This authenticator simply validates that the backend session is still valid
 * by checking if /api/v1/me succeeds.
 */
export default class CookieAuthenticator extends BaseAuthenticator {
  @service("config") declare configSvc: ConfigService;
  @service("fetch") declare fetchSvc: FetchService;

  private get isBackendManagedAuth(): boolean {
    return (
      this.configSvc.config.skip_google_auth &&
      !this.configSvc.config.skip_microsoft_auth
    );
  }

  /**
   * Authenticate by checking if the backend session is valid.
   * Since the backend manages auth, we just verify we can access /api/v2/me
   */
  async authenticate() {
    if (!this.isBackendManagedAuth) {
      throw new Error("Cookie authentication is only available in Microsoft auth mode");
    }

    try {
      // Check if backend session is valid by calling /api/v2/me
      // Note: Using v2 directly since backend supports v2 API
      const response = await this.fetchSvc.fetch("/api/v2/me", {
        method: "HEAD",
      });

      if (response && response.ok) {
        // Backend session is valid - return minimal session data
        // The actual user data will be loaded by authenticatedUser.loadInfo
        return { authenticatedAt: new Date().toISOString() };
      } else {
        throw new Error("Backend session invalid");
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Restore the session by checking if backend session is still valid.
   * Called on app initialization to restore previous session.
   */
  async restore(data: any) {
    if (!this.isBackendManagedAuth) {
      throw new Error("Session restore failed - cookie auth is not active");
    }

    // Check if backend session is still valid
    try {
      const response = await this.fetchSvc.fetch("/api/v2/me", {
        method: "HEAD",
      });

      if (response && response.ok) {
        return data; // Backend session still valid
      } else {
        throw new Error("Backend session expired");
      }
    } catch (error) {
      throw new Error("Session restore failed - backend session invalid");
    }
  }

  /**
   * Invalidation is handled by the backend (/logout endpoint).
   * This just confirms the session should be cleared client-side.
   */
  async invalidate() {
    // Backend handles actual invalidation via /logout
    // This just allows ESA to clear client-side session data
    return Promise.resolve();
  }
}
