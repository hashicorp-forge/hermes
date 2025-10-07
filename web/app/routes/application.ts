import Route from "@ember/routing/route";
import { UnauthorizedError } from "@ember-data/adapter/error";
import { action } from "@ember/object";
import { service } from "@ember/service";
import ConfigService from "hermes/services/config";
import FetchService from "hermes/services/fetch";
import SessionService, { REDIRECT_STORAGE_KEY } from "hermes/services/session";
import RouterService from "@ember/routing/router-service";

import window from "ember-window-mock";
import Transition from "@ember/routing/transition";
import MetricsService from "hermes/services/_metrics";

export default class ApplicationRoute extends Route {
  @service declare config: ConfigService;
  @service("fetch") declare fetchSvc: FetchService;
  @service declare session: SessionService;
  @service declare router: RouterService;
  @service declare metrics: MetricsService;

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

  async beforeModel(transition: Transition) {
    /**
     * We expect a `transition.intent.url`, but in rare cases, it's undefined,
     * e.g., when clicking the "view dashboard" button from the 404 route.
     * When this happens, we fall back to `transition.to.name`.
     *
     * For reference:
     * `transition.intent.url` e.g., 'documents/1'
     * `transition.to.name` e.g., 'authenticated.documents'
     */

    // @ts-ignore - `intent` not defined in `Transition` type
    let transitionTo = transition.intent.url ?? transition.to.name;

    /**
     * If a transition intent exists and it isn't to the `/` or `authenticate` routes,
     * capture and save it to session/localStorage for a later redirect.
     */
    if (
      transitionTo &&
      transitionTo !== "/" &&
      transitionTo !== "authenticate"
    ) {
      window.sessionStorage.setItem(REDIRECT_STORAGE_KEY, transitionTo);
      window.localStorage.setItem(
        REDIRECT_STORAGE_KEY,
        JSON.stringify({
          url: transitionTo,
          expiresOn: Date.now() + 60 * 5000, // 5 minutes
        }),
      );
    }

    await this.session.setup();

    await this.fetchSvc
      .fetch(`/api/${this.config.config.api_version}/web/config`)
      .then((response) => response?.json())
      .then((json) => {
        this.config.setConfig(json);
      })
      .catch((err) => {
        console.log("Error fetching and setting web config: " + err);
      });

    // Initialize the metrics service
    this.metrics;
  }
}
