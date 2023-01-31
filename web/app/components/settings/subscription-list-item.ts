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

  @tracked popoverIsShown = false;
  @tracked popoverIsClosing = false;

  /**
   * Determines whether the user is subscribed to the product area.
   */
  protected get isChecked(): boolean {
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
    this.showPopover.perform();
  }

  showPopover = restartableTask(async () => {
    // this.popoverIsShown = false;
    this.popoverIsClosing = false;
    this.popoverIsShown = true;
    await timeout(POPOVER_SHOW_DURATION * .75);
    this.popoverIsClosing = true;
    await timeout(POPOVER_SHOW_DURATION * .25);
    this.popoverIsShown = false;
    this.popoverIsClosing = false;
  });
}
