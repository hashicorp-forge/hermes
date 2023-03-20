import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import window from "ember-window-mock";
import SessionService, { SESSION_STORAGE_KEY } from "hermes/services/session";

export default class AuthenticatedRoute extends Route {
  @service declare session: SessionService;
  @service declare authenticatedUser: AuthenticatedUserService;

  async afterModel(): Promise<void> {
    await this.authenticatedUser.loadInfo.perform();
  }

  async beforeModel(transition: any): Promise<void> {
    // If the user isn't authenticated, transition to the auth screen
    let requireAuthentication = this.session.requireAuthentication(
      transition,
      "authenticate"
    );

    let target = window.sessionStorage.getItem(SESSION_STORAGE_KEY);

    if (
      !target &&
      !requireAuthentication &&
      transition.to.name != "authenticated.index"
    ) {
      // ember-simple-auth uses this value to set cookies when fastboot is enabled: https://github.com/mainmatter/ember-simple-auth/blob/a7e583cf4d04d6ebc96b198a8fa6dde7445abf0e/packages/ember-simple-auth/addon/-internals/routing.js#L12

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

      window.sessionStorage.setItem(SESSION_STORAGE_KEY, transitionTo);
    }
  }
}
