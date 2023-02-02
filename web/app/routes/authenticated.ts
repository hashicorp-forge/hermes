import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import Transition from "@ember/routing/transition";

export default class AuthenticatedRoute extends Route {
  @service declare session: any;
  @service declare authenticatedUser: AuthenticatedUserService;

  async afterModel(): Promise<void> {
    // Load user info
    await this.authenticatedUser.loadInfo.perform();
  }

  async beforeModel(transition: any): Promise<void> {
    let target = sessionStorage.getItem(this.session.SESSION_STORAGE_KEY);
    if (transition.to.name != "authenticated.index" && !target) {
      // apparently transition.intent is private or at least not documented so typing
      // fails on this line
      // ember-simple-auth uses this value to set cookies when fastboot is enabled: https://github.com/mainmatter/ember-simple-auth/blob/a7e583cf4d04d6ebc96b198a8fa6dde7445abf0e/packages/ember-simple-auth/addon/-internals/routing.js#L12
      sessionStorage.setItem(this.session.SESSION_STORAGE_KEY, transition.intent.url);
    }
  }
}
