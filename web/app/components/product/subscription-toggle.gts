import Component from "@glimmer/component";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import { HermesSize } from "hermes/types/sizes";
import FlagsService from "hermes/services/flags";
import TooltipIcon from "hermes/components/tooltip-icon";
import HdsButton from "@hashicorp/design-system-components/components/hds/button";
import { on } from "@ember/modifier";

interface ProductSubscriptionToggleComponentSignature {
  Element: HTMLDivElement;
  Args: {
    product: string;
    hasTooltip?: boolean;
    size?: `${HermesSize.Small}`;
  };
  Blocks: {
    default: [];
  };
}

export default class ProductSubscriptionToggleComponent extends Component<ProductSubscriptionToggleComponentSignature> {
  @service declare authenticatedUser: AuthenticatedUserService;
  @service declare flags: FlagsService;

  private get isSubscribed() {
    return this.authenticatedUser.subscriptions?.some(
      (subscription) => subscription.productArea === this.args.product,
    );
  }

  @action protected toggleSubscription() {
    if (this.isSubscribed) {
      void this.authenticatedUser.removeSubscription.perform(this.args.product);
    } else {
      void this.authenticatedUser.addSubscription.perform(this.args.product);
    }
  }

  <template>
    <div class="relative mt-6 inline-flex">
      <div class="w-[128px]">
        <HdsButton
          {{on "click" this.toggleSubscription}}
          class="pill-button {{if this.isSubscribed 'pr-[18px]' 'pr-[21px]'}}"
          @icon={{if this.isSubscribed "check" "plus"}}
          @color="secondary"
          @text={{if this.isSubscribed "Subscribed" "Subscribe"}}
          @isFullWidth={{true}}
        />
      </div>
      {{#if @hasTooltip}}
        <TooltipIcon
          @text={{if
            this.isSubscribed
            "You'll be emailed when a document is published in this product/area."
            "Get emailed when a document is published in this product/area"
          }}
          class="absolute -right-2 top-1/2 translate-x-full -translate-y-1/2 text-color-foreground-disabled"
        />
      {{/if}}
    </div>
  </template>
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Product::SubscriptionToggle": typeof ProductSubscriptionToggleComponent;
  }
}
