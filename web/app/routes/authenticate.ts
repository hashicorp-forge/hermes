import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import ConfigService from "hermes/services/config";
import RouterService from "@ember/routing/router-service";
import SessionService from "hermes/services/session";
import config from "hermes/config/environment";

export default class AuthenticateRoute extends Route {
  @service("config") declare configSvc: ConfigService;
  @service declare router: RouterService;
  @service declare session: SessionService;

  async beforeModel() {
    console.log("AuthenticateRoute: Entering beforeModel");

    /**
     * If we're skipping auth, redirect right away because this route
     * isn't useful.
     */
    if (this.configSvc.config.skip_google_auth) {
      console.log("AuthenticateRoute: Skipping authentication, redirecting to `/`");
      this.router.replaceWith("/");
      return;
    }

    /**
     * Checks if the session is authenticated,
     * and if it is, transitions to the specified route.
     * If it's not, the route will render normally.
     */
    console.log("AuthenticateRoute: Checking if session is already authenticated");
    this.session.prohibitAuthentication("/");
    console.log("AuthenticateRoute: Session is not authenticated, rendering route");
  }

  async model() {
    // Check for Microsoft token
    const microsoftToken = document.cookie
      .split("; ")
      .find((row) => row.startsWith("microsoft_token="))
      ?.split("=")[1];

    if (microsoftToken) {
      console.log("AuthenticateRoute: Found Microsoft token, authenticating with Ember Simple Auth");
      try {
        // Create a custom authenticator for Microsoft or adapt an existing one
        await this.session.authenticate("authenticator:microsoft", { token: microsoftToken });
        console.log("AuthenticateRoute: Successfully authenticated with Ember Simple Auth");
        this.router.replaceWith("/");
        return;
      } catch (error) {
        console.error("AuthenticateRoute: Error authenticating with Ember Simple Auth", error);
      }
    }
  }
}
