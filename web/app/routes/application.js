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
  @service metrics;
  @service router;

  constructor() {
    super(...arguments);

    this.router.on("routeDidChange", () => {
      this.metrics.trackPage({
        page: this.router.currentURL,
        title: document.title || 'unknown',
      });
    });
  }

  @action
  error(error) {
    if (error instanceof UnauthorizedError) {
      this.session.invalidate();
      return;
    }
  }

  async beforeModel() {
    this.session.setup();

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
