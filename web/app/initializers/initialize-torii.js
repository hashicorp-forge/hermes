// TEMPORARILY DISABLED FOR EMBER 6.x UPGRADE
// import bootstrapTorii from "torii/bootstrap/torii";
// import { configure } from "torii/configuration";
import config from "../config/environment";
import fetch from "fetch";

/**
 * This file overrides https://github.com/FMGSuite/torii/blob/8abbfe99b3a820470192e7cfcf7795be375d9b47/app/initializers/initialize-torii.js
 *
 * The initializer needed to be overridden to add functionality to fetch Google
 * OAuth configuration from the backend API instead of baking it into the app.
 */

export function initialize(application) {
  if (arguments[1]) {
    // Ember < 2.1
    application = arguments[1];
  }

  // Set Google OAuth config from the backend in production (and if not skipping
  // Google auth).
  if (config.environment === "production") {
    fetch("/api/v1/web/config")
      .then((response) => response?.json())
      .then((json) => {
        if (!json.skip_google_auth) {
          config.torii.providers["google-oauth2-bearer-v2"].apiKey =
            json.google_oauth2_client_id ?? "";
          config.torii.providers["google-oauth2-bearer-v2"].hd =
            json.google_oauth2_hd ?? "";
        }
      })
      .catch((err) => {
        console.log("Error fetching web config for auth: " + err);
        throw err;
      });
  }

  configure(config.torii || {});
  bootstrapTorii(application);
  application.inject("route", "torii", "service:torii");
}

export default {
  name: "torii",
  initialize: function() {
    // TEMPORARILY DISABLED FOR EMBER 6.x UPGRADE
    console.warn("Torii authentication temporarily disabled during Ember upgrade");
  },
};
