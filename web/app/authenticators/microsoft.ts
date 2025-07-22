import { inject as service } from "@ember/service";
import BaseAuthenticator from "ember-simple-auth/authenticators/base";
import ConfigService from "hermes/services/config";
import FetchService from "hermes/services/fetch";

// Define Microsoft configuration interface locally
interface MicrosoftConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  redirectUri: string;
}

export default class MicrosoftAuthenticator extends BaseAuthenticator {
  @service("config") declare configSvc: ConfigService;
  @service("fetch") declare fetchSvc: FetchService;

  /**
   * Authenticate using the authorization code from Microsoft OAuth callback.
   */
  async authenticate(options: any = {}) {
    try {
      const { code, state } = options;

      console.log("Microsoft authenticator called with code and state");

      if (!code || !state) {
        throw new Error("Missing code or state parameter from Microsoft OAuth callback");
      }

      // Use type assertion to bypass the TypeScript error
      const microsoft = (this.configSvc as any).microsoft as MicrosoftConfig;

      // Exchange the authorization code for an access token
      const tokenEndpoint = `https://login.microsoftonline.com/${microsoft.tenantId}/oauth2/v2.0/token`;
      const body = new URLSearchParams({
        client_id: microsoft.clientId,
        client_secret: microsoft.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: microsoft.redirectUri,
      });

      console.log("Exchanging authorization code for access token...");

      const response = await this.fetchSvc.fetch(tokenEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });

      if (!response || !response.ok) {
        const error = response ? await response.json() : "No response received";
        console.error("Failed to exchange authorization code:", error);
        throw new Error("Failed to exchange authorization code");
      }

      const tokenData = await response.json();
      console.log("Access token received:", tokenData);

      // Store the token in the session
      return {
        access_token: tokenData.access_token,
        token_type: tokenData.token_type,
        expires_at: Date.now() + tokenData.expires_in * 1000, // Calculate expiration time
      };
    } catch (error) {
      console.error("Microsoft authentication error:", error);
      throw error instanceof Error ? error : new Error("Authentication failed");
    }
  }

  /**
   * Restore the session using the stored token.
   */
  async restore(data: any) {
    console.log("Restoring session with data:", data);

    if (!data || !data.access_token) {
      console.error("No access token found in session data");
      throw new Error("No access token found");
    }

    // Optionally, validate the token with Microsoft or check expiration
    const isTokenValid = data.expires_at && Date.now() < data.expires_at;
    if (!isTokenValid) {
      console.error("Access token is expired or invalid");
      throw new Error("Access token is expired or invalid");
    }

    console.log("Session restored successfully");
    return data;
  }

  /**
   * Invalidate the session by clearing the stored token.
   */
  async invalidate() {
    console.log("Invalidating Microsoft session");
    // Clear any stored tokens
    localStorage.removeItem("ms_auth_debug_token");
    return Promise.resolve();
  }
}
