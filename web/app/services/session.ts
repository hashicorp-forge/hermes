import { inject as service } from "@ember/service";
import RouterService from "@ember/routing/router-service";
import EmberSimpleAuthSessionService from "ember-simple-auth/services/session";
import window from "ember-window-mock";
import { keepLatestTask } from "ember-concurrency";
import FlashMessageService from "ember-cli-flash/services/flash-messages";
import Ember from "ember";
import { tracked } from "@glimmer/tracking";
import simpleTimeout from "hermes/utils/simple-timeout";
import ConfigService from "hermes/services/config";
import FetchService from "./fetch";

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
  @service("config") declare configSvc: ConfigService;
  @service declare router: RouterService;
  @service declare fetch: FetchService;
  @service declare session: SessionService;
  @service declare flashMessages: FlashMessageService;

  /**
   * Whether the current session is valid.
   * Set false if our poll response is 401, and when the
   * user requires authentication with EmberSimpleAuth.
   */
  @tracked tokenIsValid = true;

  /**
   * Whether the service should show a reauthentication message.
   * True when the user has dismissed a previous re-auth message.
   */
  @tracked preventReauthenticationMessage = false;

  /**
   * Whether the last poll response was a 401.
   * Updated by the fetch service on every pollCall.
   */
  @tracked pollResponseIs401 = false;

  /**
   * A persistent task that periodically checks if the user's
   * session has expired, and shows a flash message if it has.
   * Kicked off by the Authenticated route.
   */
  pollForExpiredAuth = keepLatestTask(async () => {
    await simpleTimeout(Ember.testing ? 100 : 10000);

    this.fetch.fetch(
      "/api/v1/me",
      {
        method: "HEAD",
      },
      true
    );

    if (!this.configSvc.config.skip_google_auth) {
      let isLoggedIn = await this.requireAuthentication(null, () => {});

      if (this.pollResponseIs401 || !isLoggedIn) {
        this.tokenIsValid = false;
      }
    } else {
      this.tokenIsValid = !this.pollResponseIs401;
    }

    if (this.tokenIsValid) {
      this.preventReauthenticationMessage = false;
    } else if (!this.preventReauthenticationMessage) {
      if (!this.configSvc.config.skip_google_auth) {
        this.flashMessages.add({
          title: "Login token expired",
          message: "Please reauthenticate to keep using Hermes.",
          type: "warning",
          sticky: true,
          destroyOnClick: false,
          preventDuplicates: true,
          buttonText: "Authenticate with Google",
          buttonIcon: "google",
          buttonAction: () => {
            this.authenticate("authenticator:torii", "google-oauth2-bearer");
            this.flashMessages.clearMessages();
          },
          onDestroy: () => {
            this.preventReauthenticationMessage = true;
          },
        });
      } else {
        this.flashMessages.add({
          title: "Session expired",
          message: "Please reauthenticate to keep using Hermes.",
          type: "warning",
          sticky: true,
          destroyOnClick: false,
          preventDuplicates: true,
          buttonText: "Authenticate with Okta",
          buttonIcon: "okta",
          buttonAction: () => {
            // Reload to redirect to Okta login.
            window.location.reload();
            this.flashMessages.clearMessages();
          },
          onDestroy: () => {
            this.preventReauthenticationMessage = true;
          },
        });
      }
    }

    this.pollForExpiredAuth.perform();
  });

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
