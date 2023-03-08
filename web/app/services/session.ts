import { inject as service } from "@ember/service";
import RouterService from "@ember/routing/router-service";
import EmberSimpleAuthSessionService from "ember-simple-auth/services/session";
import window from "ember-window-mock";
import { task, timeout } from "ember-concurrency";
import FlashMessageService from "ember-cli-flash/services/flash-messages";
import Ember from "ember";
import { tracked } from "@glimmer/tracking";

const TIMEOUT_VALUE = Ember.testing ? 0 : 60000;

export default class SessionService extends EmberSimpleAuthSessionService {
  @service declare router: RouterService;
  @service declare flashMessages: FlashMessageService;

  readonly SESSION_STORAGE_KEY: string = "hermes.redirectTarget";

  @tracked preventReauthenticationMessage = false;

  checkIfAuthTokenExpired = task(async () => {
    await timeout(TIMEOUT_VALUE);

    let tokenIsValid = await this.requireAuthentication(null, () => {});

    if (tokenIsValid) {
      this.preventReauthenticationMessage = false;
    } else if (!this.preventReauthenticationMessage) {
      this.flashMessages.add({
        title: "Google token expired",
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
          this.preventReauthenticationMessage = false;
        },
        onDestroy: () => {
          this.preventReauthenticationMessage = true;
        },
      });
    }

    this.checkIfAuthTokenExpired.perform();
  });

  // ember-simple-auth only uses a cookie to track redirect target if you're using fastboot, otherwise it keeps track of the redirect target as a parameter on the session service. See the source here: https://github.com/mainmatter/ember-simple-auth/blob/a7e583cf4d04d6ebc96b198a8fa6dde7445abf0e/packages/ember-simple-auth/addon/-internals/routing.js#L33-L50
  //
  // Because we redirect as part of the authentication flow, the parameter storing the transition gets reset. Instead, we keep track of the redirectTarget in browser sessionStorage and override the handleAuthentication method as recommended by ember-simple-auth.

  handleAuthentication(routeAfterAuthentication: string) {
    let redirectTarget = window.sessionStorage.getItem(
      this.SESSION_STORAGE_KEY
    );
    let transition;

    if (redirectTarget) {
      transition = this.router.transitionTo(redirectTarget);
    } else {
      transition = this.router.transitionTo(
        `authenticated.${routeAfterAuthentication}`
      );
    }
    transition.followRedirects().then(() => {
      window.sessionStorage.removeItem(this.SESSION_STORAGE_KEY);
    });
  }
}
