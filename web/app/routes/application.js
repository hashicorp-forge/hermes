import Route from "@ember/routing/route";
import { UnauthorizedError } from "@ember-data/adapter/error";
import { action } from "@ember/object";
import config from "hermes/config/environment";
import { inject as service } from "@ember/service";
import window from "ember-window-mock";
import { REDIRECT_STORAGE_KEY } from "hermes/services/session";

export default class ApplicationRoute extends Route {
  @service config;
  @service("fetch") fetchSvc;
  @service flags;
  @service session;
  @service router;

  @action
  error(error) {
    if (error instanceof UnauthorizedError) {
      this.session.invalidate();
      this.router.transitionTo("authenticate");
      return;
    }
  }

  async beforeModel(transition) {
    /**
     * We expect a `transition.intent.url`, but in rare cases, it's undefined,
     * e.g., when clicking the "view dashboard" button from the 404 route.
     * When this happens, we fall back to `transition.to.name`.
     *
     * For reference:
     * `transition.intent.url` e.g., 'documents/1'
     * `transition.to.name` e.g., 'authenticated.documents'
     */
    let transitionTo = transition.intent.url ?? transition.to.name;

    /**
     * Capture the transition intent and save it to session/localStorage.
     */
    window.sessionStorage.setItem(REDIRECT_STORAGE_KEY, transitionTo);
    window.localStorage.setItem(
      REDIRECT_STORAGE_KEY,
      JSON.stringify({
        url: transitionTo,
        expiresOn: Date.now() + 60 * 5000, // 5 minutes
      })
    );

    await this.session.setup();

    // Flags read from the environment and set properties on the service this
    // could be done in an initializer, but this seems more natural these days
    this.flags.initialize();

    // Get web config from backend if this is a production build.
    if (config.environment === "production") {
      return this.fetchSvc
        .fetch("/api/v1/web/config")
        .then((response) => response.json())
        .then((json) => {
          this.config.setConfig(json);
        })
        .catch((err) => {
          console.log("Error fetching and setting web config: " + err);
        });
    }
  }
}
