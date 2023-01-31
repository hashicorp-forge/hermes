import Component from "@glimmer/component";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import { assert } from "@ember/debug";

interface SettingsSubscriptionListItemComponentSignature {
  Args: {
    productArea: string;
  };
}

export default class SettingsSubscriptionListItemComponent extends Component<SettingsSubscriptionListItemComponentSignature> {
  @service declare authenticatedUser: AuthenticatedUserService;

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
      this.authenticatedUser.removeSubscription.perform(this.args.productArea);
    } else {
      this.authenticatedUser.addSubscription.perform(this.args.productArea);
    }
  }
}
