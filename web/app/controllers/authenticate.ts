import Controller from "@ember/controller";
import { inject as service } from "@ember/service";
import { action } from "@ember/object";
import RouterService from "@ember/routing/router-service";
import Transition from "@ember/routing/transition";
import SessionService from "ember-simple-auth/session";

export default class AuthenticateController extends Controller {
  @service declare router: RouterService;
  @service declare session: SessionService;

  previousTransition: Transition | null = null;

  protected get currentYear(): number {
    return new Date().getFullYear();
  }

  @action protected authenticate(): void {
    this.session.authenticate("authenticator:torii", "google-oauth2-bearer");

    // Capture the previousTransition locally if it exists
    let _previousTransition = this.previousTransition;

    if (_previousTransition) {
      // Clear the previousTransition class property
      this.previousTransition = null;

      // Retry the initial transition
      _previousTransition.retry();
    } else {
      this.router.transitionTo("authenticated.dashboard");
    }
  }
}

declare module "@ember/controller" {
  interface Registry {
    authenticate: AuthenticateController;
  }
}
