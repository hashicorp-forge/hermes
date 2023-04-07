import Route from "@ember/routing/route";
import { inject as service } from "@ember/service";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import window from "ember-window-mock";
import SessionService, { REDIRECT_STORAGE_KEY } from "hermes/services/session";

export default class AuthenticatedRoute extends Route {
  @service declare session: SessionService;
  @service declare authenticatedUser: AuthenticatedUserService;

  async afterModel(transition: any): Promise<void> {
    console.log("afterModel transition", transition);
    // If the user isn't authenticated, transition to the auth screen
    let isLoggedIn = this.session.requireAuthentication(
      transition,
      "authenticate"
    );
    console.log("afterModel isLoggedIn", isLoggedIn);

    if (isLoggedIn) {
      await this.authenticatedUser.loadInfo.perform();
      void this.session.pollForExpiredAuth.perform();
    }
  }

  async beforeModel(transition: any): Promise<void> {
    console.log("beforeModel transition", transition);

    // If the user isn't authenticated, transition to the auth screen
    let requireAuthentication = this.session.requireAuthentication(
      transition,
      "authenticate"
    );

    console.log("is user logged in?", requireAuthentication);
    console.log("REDIRECT_STORAGE_KEY", REDIRECT_STORAGE_KEY);

    // See if we have a redirect target stored in sessionStorage
    let storageItem = window.sessionStorage.getItem(REDIRECT_STORAGE_KEY);

    console.log("storageItem", storageItem);

    if (!storageItem) {
      console.log("nothing in sessionStorage, trying localStorage");

      // If we don't have a redirect target in sessionStorage, check localStorage
      storageItem = window.localStorage.getItem(REDIRECT_STORAGE_KEY);

      console.log("localStorage value:", storageItem);

      // If the redirect target in localStorage is expired, remove it
      if (storageItem && Date.now() > JSON.parse(storageItem).expiresOn) {
        console.log("removing expired localStorage item");
        window.localStorage.removeItem(REDIRECT_STORAGE_KEY);
        storageItem = null;
      }
    }
    //investigate what's happening in restore();

    // look out for "undefined" (the string)

    console.log("transition", transition);
    console.log("transition.to.name", transition.to.name);
    console.log(
      'transition.to.name != "authenticated.index"',
      transition.to.name != "authenticated.index"
    );

    if (
      //consider ignoring the !storageItem call and just always assign an object
      !storageItem &&
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
      console.log("setting storage items");
      console.log("transition.intent.url", transition.intent.url);
      console.log("transition.to.name", transition.to.name);

      let transitionTo = transition.intent.url ?? transition.to.name;

      console.log("transitionTo", transitionTo);

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
}
