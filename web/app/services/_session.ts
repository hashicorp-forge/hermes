import { service } from "@ember/service";
import RouterService from "@ember/routing/router-service";
import EmberSimpleAuthSessionService from "ember-simple-auth/services/session";
import window from "ember-window-mock";
import { dropTask, keepLatestTask, timeout } from "ember-concurrency";
import { isTesting } from "@embroider/macros";
import { tracked } from "@glimmer/tracking";
import simpleTimeout from "hermes/utils/simple-timeout";
import ConfigService from "hermes/services/config";
import FetchService from "./fetch";
import AuthenticatedUserService from "./authenticated-user";
import { capitalize } from "@ember/string";
import FlashObject from "ember-cli-flash/flash/object";
import HermesFlashMessagesService from "./flash-messages";

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
  @service declare flashMessages: HermesFlashMessagesService;
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
  @tracked preventReauthMessage = false;

  /**
   * Whether the last poll response was a 401.
   * Updated by the fetch service on every pollCall.
   */
  @tracked pollResponseIs401 = false;

  /**
   * The flash object for the reauthentication message.
   * Partly dictates if we poll the back end for a 401.
   * Removed when the user successfully reauthenticates.
   */
  @tracked reauthFlashMessage: FlashObject | null = null;

  /**
   * Whether the app is configured to use OIDC (Okta or Dex).
   * Dictates reauthButton text and behavior.
   * Determines whether we poll the back end for a 401
   * while the reauthentication message is shown.
   */
  get isUsingOIDC(): boolean {
    const provider = this.configSvc.config.auth_provider;
    return provider === "okta" || provider === "dex";
  }

  /**
   * Legacy compatibility - Okta was the first non-Google provider
   */
  get isUsingOkta(): boolean {
    return this.isUsingOIDC;
  }

  /**
   * A persistent task that periodically checks if the user's
   * session has expired, and shows a flash message if it has.
   * Kicked off by the Authenticated route.
   */
  pollForExpiredAuth = keepLatestTask(async () => {
    await simpleTimeout(isTesting() ? 100 : 10000);

    // Make a HEAD request to the back end.
    // On 401, the fetch service will set `this.pollResponseIs401` true.
    await this.fetch.fetch(
      "/api/v2/me",
      { method: "HEAD" },
      true,
    );

    if (this.isUsingOIDC) {
      this.tokenIsValid = !this.pollResponseIs401;
    } else {
      let isLoggedIn = this.requireAuthentication(null, () => {});
      if (this.pollResponseIs401 || !isLoggedIn) {
        this.tokenIsValid = false;
      } else {
        this.tokenIsValid = true;
      }
    }

    if (this.tokenIsValid) {
      this.preventReauthMessage = false;

      // In case the user reauthenticates while the message is shown,
      // e.g., in another tab, destroy the message.
      if (this.reauthFlashMessage) {
        this.reauthFlashMessage.destroyMessage();
      }
    } else if (!this.preventReauthMessage) {
      this.showReauthMessage(
        "Session expired",
        "Please reauthenticate to keep using Hermes.",
        "warning",
        () => {
          this.preventReauthMessage = true;
        },
      );
    }

    // Restart this very task.
    this.pollForExpiredAuth.perform();
  });

  /**
   * Triggers a flash message with a button to reauthenticate.
   * Used when the user's session has expired, or when the user
   * unsuccessfully attempts to reauthenticate.
   * Functions in accordance with the `skip_google_auth` config.
   */
  private showReauthMessage(
    title: string,
    message: string,
    type: "warning" | "critical",
    onDestroy?: () => void,
  ) {
    const buttonIcon = this.isUsingOkta ? "okta" : "google";

    const buttonText = `Authenticate with ${capitalize(buttonIcon)}`;

    this.reauthFlashMessage = this.flashMessages
      .add({
        title,
        message,
        type,
        sticky: true,
        destroyOnClick: false,
        preventDuplicates: true,
        buttonText,
        buttonIcon,
        buttonAction: async () => await this.reauthenticate.perform(),
        onDestroy,
      })
      .getFlashObject();
  }

  /**
   * Makes an attempt to reauthenticate the user. Triggered by the button in the
   * "session expired" flash message. On re-auth, shows a success message
   * and resets the locally tracked parameters. On failure, shows a "critical"
   * error message with a button to retry.
   */
  protected reauthenticate = dropTask(async () => {
    try {
      if (this.isUsingOIDC) {
        // Reload to redirect to OIDC provider (Okta or Dex)
        window.location.reload();
      } else {
        // Google OAuth flow
        await this.authenticate("authenticator:custom-auth", "google-oauth2-bearer");
      }

      this.reauthFlashMessage?.destroyMessage();

      // Wait a bit to show the success message.
      await timeout(isTesting() ? 0 : 1000);

      this.flashMessages.add({
        title: "Login successful",
        message: `Welcome back${
          this.authenticatedUser.info?.firstName
            ? `, ${this.authenticatedUser.info.firstName}`
            : ""
        }!`,
        destroyOnClick: true,
      });

      this.preventReauthMessage = false;
    } catch (error: unknown) {
      this.reauthFlashMessage?.destroyMessage();
      this.showReauthMessage("Login failed", error as string, "critical");
    }
  });

  // ember-simple-auth only uses a cookie to track redirect target if you're using fastboot, otherwise it keeps track of the redirect target as a parameter on the session service. See the source here: https://github.com/mainmatter/ember-simple-auth/blob/a7e583cf4d04d6ebc96b198a8fa6dde7445abf0e/packages/ember-simple-auth/addon/-internals/routing.js#L33-L50
  //
  // Because we redirect as part of the authentication flow, the parameter storing the transition gets reset. Instead, we keep track of the redirectTarget in browser sessionStorage and override the handleAuthentication method as recommended by ember-simple-auth.

  handleAuthentication(routeAfterAuthentication: string) {
    if (this.authenticatedUser._info) {
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
        `authenticated.${routeAfterAuthentication}`,
      );
    }
    transition.followRedirects().then(() => {
      window.sessionStorage.removeItem(REDIRECT_STORAGE_KEY);
      window.localStorage.removeItem(REDIRECT_STORAGE_KEY);
    });
  }
}
