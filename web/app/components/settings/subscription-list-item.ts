import Component from "@glimmer/component";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import { assert } from "@ember/debug";
import { tracked } from "@glimmer/tracking";
import { restartableTask, task, timeout } from "ember-concurrency";
import Ember from "ember";

interface SettingsSubscriptionListItemComponentSignature {
  Args: {
    productArea: string;
  };
}

const POPOVER_SHOW_DURATION = Ember.testing ? 0 : 1500;

export default class SettingsSubscriptionListItemComponent extends Component<SettingsSubscriptionListItemComponentSignature> {
  @service declare authenticatedUser: AuthenticatedUserService;

  @tracked protected confirmationIsShown = false;
  @tracked protected confirmationIsClosing = false;

  /**
   * Determines whether the user is subscribed to the product area.
   */
  protected get isChecked(): boolean {
    console.log(this.authenticatedUser);
    assert(
      "isChecked expects a subscriptions list",
      this.authenticatedUser.subscriptions
    );
    return this.authenticatedUser.subscriptions.some(
      (subscription) => subscription.productArea === this.args.productArea
    );
  }

  /**
   * Toggles the subscription for the product area.
   * Currently only supports "instant" subscriptions.
   */
  @action protected toggleChecked(): void {
    if (this.isChecked) {
      void this.authenticatedUser.removeSubscription.perform(
        this.args.productArea
      );
    } else {
      void this.authenticatedUser.addSubscription.perform(
        this.args.productArea
      );
    }
    void this.temporarilyShowConfirmation.perform();
  }

  /**
   * Shows the confirmation message for a time, then hides it.
   */
  protected temporarilyShowConfirmation = restartableTask(async () => {
    this.confirmationIsClosing = false;
    this.confirmationIsShown = true;
    await timeout(POPOVER_SHOW_DURATION * 0.75);

    // Used to add an `.out` class to our message, animating it out.
    this.confirmationIsClosing = true;

    await timeout(POPOVER_SHOW_DURATION * 0.25);
    this.confirmationIsShown = false;
    this.confirmationIsClosing = false;
  });
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Settings::SubscriptionListItem": typeof SettingsSubscriptionListItemComponent;
  }
}
