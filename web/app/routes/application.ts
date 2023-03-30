import Route from "@ember/routing/route";
import { UnauthorizedError } from "@ember-data/adapter/error";
import { action } from "@ember/object";
import config from "hermes/config/environment";
import { inject as service } from "@ember/service";
import ConfigService from "hermes/services/config";
import FetchService from "hermes/services/fetch";
import SessionService from "hermes/services/session";

export default class ApplicationRoute extends Route {
  @service declare config: ConfigService;
  @service("fetch") declare fetchSvc: FetchService;
  @service declare flags: any;
  @service declare session: SessionService;

  /**
   * Catch-all for bubbled-up model errors.
   * https://guides.emberjs.com/release/routing/loading-and-error-substates/#toc_the-error-event
   */
  @action error(error: unknown) {
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
        .then((response) => response?.json())
        .then((json) => {
          this.config.setConfig(json);
        })
        .catch((err) => {
          console.log("Error fetching and setting web config: " + err);
        });
    }
  }
}
