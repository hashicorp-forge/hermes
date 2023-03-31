import { inject as service } from "@ember/service";
import RouterService from "@ember/routing/router-service";
import EmberSimpleAuthSessionService from "ember-simple-auth/services/session";
import window from "ember-window-mock";

export const REDIRECT_STORAGE_KEY = "hermes.redirectTarget";

export function isJSON(str: string) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

export default class SessionService extends EmberSimpleAuthSessionService {
  @service declare router: RouterService;

  // ember-simple-auth only uses a cookie to track redirect target if you're using fastboot, otherwise it keeps track of the redirect target as a parameter on the session service. See the source here: https://github.com/mainmatter/ember-simple-auth/blob/a7e583cf4d04d6ebc96b198a8fa6dde7445abf0e/packages/ember-simple-auth/addon/-internals/routing.js#L33-L50
  //
  // Because we redirect as part of the authentication flow, the parameter storing the transition gets reset. Instead, we keep track of the redirectTarget in browser sessionStorage and override the handleAuthentication method as recommended by ember-simple-auth.

  handleAuthentication(routeAfterAuthentication: string) {
    let redirectStorageValue =
      window.sessionStorage.getItem(REDIRECT_STORAGE_KEY) ||
      window.localStorage.getItem(REDIRECT_STORAGE_KEY);

    let redirectTarget: string | null = null;
    let transition;

    if (redirectStorageValue) {
      if (!isJSON(redirectStorageValue)) {
        redirectTarget = redirectStorageValue;
      } else if (Date.now() < JSON.parse(redirectStorageValue).expiresOn) {
        redirectTarget = JSON.parse(redirectStorageValue).url;
      }
    }

    if (redirectTarget) {
      transition = this.router.transitionTo(redirectTarget);
    } else {
      transition = this.router.transitionTo(
        `authenticated.${routeAfterAuthentication}`
      );
    }
    transition.followRedirects().then(() => {
      window.sessionStorage.removeItem(REDIRECT_STORAGE_KEY);
      window.localStorage.removeItem(REDIRECT_STORAGE_KEY);
    });
  }
}
