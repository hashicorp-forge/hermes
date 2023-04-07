import Route from "@ember/routing/route";
import { UnauthorizedError } from "@ember-data/adapter/error";
import { action } from "@ember/object";
import config from "hermes/config/environment";
import { inject as service } from "@ember/service";
import { REDIRECT_STORAGE_KEY } from "hermes/services/session";
import window from "ember-window-mock";

export default class ApplicationRoute extends Route {
  @service config;
  @service("fetch") fetchSvc;
  @service flags;
  @service session;
  @service router;

  @action
  error(error) {
    if (error instanceof UnauthorizedError) {
      console.log("an UnauthorizedError has bubbled to the application route");
      this.session.invalidate();
      this.router.transitionTo("authenticate");
      return;
    }
  }

  async beforeModel(transition) {
    let transitionTo = transition.intent.url ?? transition.to.name;

    window.sessionStorage.setItem(REDIRECT_STORAGE_KEY, transitionTo);
    window.localStorage.setItem(
      REDIRECT_STORAGE_KEY,
      JSON.stringify({
        url: transitionTo,
        expiresOn: Date.now() + 60 * 5000, // 5 minutes
      })
    );
    // consider doing the redirect storage here vs. authenticated
    console.log("applicationBeforeModel transition", transition);
    console.log("applicationBeforeModel session pre-setup", this.session);

    await this.session.setup();

    console.log("applicationBeforeModel session post-setup", this.session);

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
