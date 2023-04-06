import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import window from "ember-window-mock";
import SessionService, { REDIRECT_STORAGE_KEY } from "hermes/services/session";

export default class AuthenticatedRoute extends Route {
  @service declare session: SessionService;
  @service declare authenticatedUser: AuthenticatedUserService;

  async afterModel(transition: any): Promise<void> {
    // If the user isn't authenticated, transition to the auth screen
    let isLoggedIn = this.session.requireAuthentication(
      transition,
      "authenticate"
    );
    if (isLoggedIn) {
      await this.authenticatedUser.loadInfo.perform();
      void this.session.pollForExpiredAuth.perform();
    }
  }

  beforeModel(transition: any): void {
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
  }
}
