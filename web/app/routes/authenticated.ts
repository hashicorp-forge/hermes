import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import window from "ember-window-mock";
import SessionService from "hermes/services/session";

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

    let target = window.sessionStorage.getItem(
      this.session.SESSION_STORAGE_KEY
    );
    if (
      !target &&
      !requireAuthentication &&
      transition.to.name != "authenticated"
    ) {
      // ember-simple-auth uses this value to set cookies when fastboot is enabled: https://github.com/mainmatter/ember-simple-auth/blob/a7e583cf4d04d6ebc96b198a8fa6dde7445abf0e/packages/ember-simple-auth/addon/-internals/routing.js#L12

      window.sessionStorage.setItem(
        this.session.SESSION_STORAGE_KEY,
        transition.intent.url
      );
    }
  }
}
