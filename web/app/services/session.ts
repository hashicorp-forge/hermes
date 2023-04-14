import { inject as service } from "@ember/service";
import RouterService from "@ember/routing/router-service";
import EmberSimpleAuthSessionService from "ember-simple-auth/services/session";
import window from "ember-window-mock";
import { dropTask, keepLatestTask, timeout } from "ember-concurrency";
import FlashMessageService from "ember-cli-flash/services/flash-messages";
import Ember from "ember";
import { tracked } from "@glimmer/tracking";
import simpleTimeout from "hermes/utils/simple-timeout";
import FetchService from "./fetch";
import AuthenticatedUserService from "./authenticated-user";

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
  @service declare fetch: FetchService;
  @service declare session: SessionService;
  @service declare flashMessages: FlashMessageService;
  @service declare authenticatedUser: AuthenticatedUserService;

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

    let isLoggedIn = this.requireAuthentication(null, () => {});

    if (this.pollResponseIs401 || !isLoggedIn) {
      this.tokenIsValid = false;
    }

    if (this.tokenIsValid) {
      this.preventReauthenticationMessage = false;
    } else if (!this.preventReauthenticationMessage) {
      /**
       * Show a message and stop polling (If the user hasn't already dismissed
       * a previous message). On re-auth,`handleAuthentication` will restart the task.
       */
      this.showReauthMessage(
        "Login token expired",
        "Please reauthenticate to keep using Hermes.",
        "warning",
        () => {
          this.preventReauthenticationMessage = true;
        }
      );

      return;
    }

    this.pollForExpiredAuth.perform();
  });

  /**
   * Triggers a flash message with a button to reauthenticate.
   * Used when the user's session has expired, or when the user
   * unsuccessfully attempts to reauthenticate.
   */
  private showReauthMessage(
    title: string,
    message: string,
    type: "warning" | "critical",
    onDestroy?: () => void
  ) {
    this.flashMessages.add({
      title,
      message,
      type,
      sticky: true,
      destroyOnClick: false,
      preventDuplicates: true,
      buttonText: "Authenticate with Google",
      buttonIcon: "google",
      buttonAction: () => {
        this.reauthenticate.perform();
      },
      onDestroy,
    });
  }

  protected reauthenticate = dropTask(async () => {
    try {
      await this.authenticate("authenticator:torii", "google-oauth2-bearer");

      this.flashMessages.clearMessages();

      await timeout(Ember.testing ? 0 : 1000);

      this.flashMessages.add({
        title: "Login successful",
        message: `Welcome back${
          this.authenticatedUser.info.name
            ? `, ${this.authenticatedUser.info.name}`
            : ""
        }!`,
        type: "success",
        timeout: 3000,
        destroyOnClick: true,
      });

      this.preventReauthenticationMessage = false;
    } catch (error: unknown) {
      this.flashMessages.clearMessages();
      this.showReauthMessage(
        "Login failed",
        error as string,
        "critical"
      );
    }
  });

  // ember-simple-auth only uses a cookie to track redirect target if you're using fastboot, otherwise it keeps track of the redirect target as a parameter on the session service. See the source here: https://github.com/mainmatter/ember-simple-auth/blob/a7e583cf4d04d6ebc96b198a8fa6dde7445abf0e/packages/ember-simple-auth/addon/-internals/routing.js#L33-L50
  //
  // Because we redirect as part of the authentication flow, the parameter storing the transition gets reset. Instead, we keep track of the redirectTarget in browser sessionStorage and override the handleAuthentication method as recommended by ember-simple-auth.

  handleAuthentication(routeAfterAuthentication: string) {
    if (this.authenticatedUser.info) {
      /**
       * This will be true when reauthenticating via the "token expired" message.
       * Since we already have cached userInfo, we don't need to await it.
       */
      void this.authenticatedUser.loadInfo.perform();
      void this.pollForExpiredAuth.perform();
    }

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
