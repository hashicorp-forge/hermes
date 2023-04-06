import Route from "@ember/routing/route";
import { UnauthorizedError } from "@ember-data/adapter/error";
import { action } from "@ember/object";
import config from "hermes/config/environment";
import { inject as service } from "@ember/service";

export default class ApplicationRoute extends Route {
  @service config;
  @service("fetch") fetchSvc;
  @service flags;
  @service session;

  @action
  error(error) {
    console.log("error caught", error);
    if (error instanceof UnauthorizedError) {
      console.log("error caused the session to be invalidated");
      this.session.invalidate();
      return;
    }
  }

  async beforeModel(transition) {
    // consider doing the redirect storage here vs. authenticated
    console.log("applicationBeforeModel transition", transition);

    console.log("applicationBeforeModel pre-setup", this.session);
    try {
      await this.session.setup();
    } catch (error) {
      console.log("error in the session setup");
    }

    await this.session.setup(); // if this errors, expect ember to handle it

    console.log("applicationBeforeModel post-setup", this.session);

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
