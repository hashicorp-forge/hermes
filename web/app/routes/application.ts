import Route from "@ember/routing/route";
import { UnauthorizedError } from "@ember-data/adapter/error";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";
import type ConfigService from "hermes/services/config";
import type FetchService from "hermes/services/fetch";
import type SessionService from "hermes/services/session";
import { REDIRECT_STORAGE_KEY } from "hermes/services/session";
import type RouterService from "@ember/routing/router-service";

import window from "ember-window-mock";
import type Transition from "@ember/routing/transition";
import type MetricsService from "hermes/services/_metrics";

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

    await this.fetchSvc
      .fetch(`/api/${this.config.config.api_version}/web/config`)
      .then((response) => response?.json())
      .then((json) => {
        this.config.setConfig(json);
      })
      .catch((error) => {
        // Log error for debugging, but do not expose to user
        console.error("Failed to fetch web config:", error);
      });

    // Initialize ESA session (required by ESA 7.x)
    await this.session.setup();

    // Try to authenticate with a backend-managed cookie session only when
    // running in SharePoint/Microsoft mode without external auth.
    if (
      this.config.config.skip_google_auth &&
      !this.config.config.skip_microsoft_auth &&
      !this.session.hasAuthentication()
    ) {
      try {
        await this.session.authenticate("authenticator:cookie");
      } catch (_error) {
        // Not authenticated yet - user will be redirected to /authenticate by requireAuthentication.
      }
    }

  // Initialize the metrics service
  this.metrics;
  }
}
