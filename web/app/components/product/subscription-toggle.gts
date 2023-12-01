import Component from "@glimmer/component";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import { HermesSize } from "hermes/types/sizes";
import TooltipIcon from "hermes/components/tooltip-icon";
import { on } from "@ember/modifier";
import FlightIcon from "@hashicorp/ember-flight-icons/components/flight-icon";
import Action from "hermes/components/action";
import {
  NOT_SUBSCRIBED_TOOLTIP_TEXT,
  IS_SUBSCRIBED_TOOLTIP_TEXT,
} from "hermes/utils/tooltip-text";

interface ProductSubscriptionToggleComponentSignature {
  Element: HTMLDivElement;
  Args: {
    product: string;
    hasTooltip?: boolean;
    size?: `${HermesSize.Small}`;
  };
}

export default class ProductSubscriptionToggleComponent extends Component<ProductSubscriptionToggleComponentSignature> {
  @service declare authenticatedUser: AuthenticatedUserService;

  private get isSubscribed() {
    return this.authenticatedUser.subscriptions?.some(
      (subscription) => subscription.productArea === this.args.product,
    );
  }

  private get tooltipText() {
    return this.isSubscribed
      ? IS_SUBSCRIBED_TOOLTIP_TEXT
      : NOT_SUBSCRIBED_TOOLTIP_TEXT;
  }

  @action private toggleSubscription() {
    if (this.isSubscribed) {
      void this.authenticatedUser.removeSubscription.perform(this.args.product);
    } else {
      void this.authenticatedUser.addSubscription.perform(this.args.product);
    }
  }

  <template>
    <div class="relative inline-flex" ...attributes>
      <Action
        data-test-product-subscription-toggle
        data-test-subscribed={{this.isSubscribed}}
        class="hds-button pill-button justify-center
          {{if @size 'h-7 w-[118px] text-body-100' 'h-9 w-[128px]'}}
          {{if
            this.isSubscribed
            'hds-button--color-primary'
            'hds-button--color-secondary'
          }}"
        {{on "click" this.toggleSubscription}}
      >
        <div class="flex items-center gap-[5px]">
          <FlightIcon
            @name={{if this.isSubscribed "check" "plus"}}
            class={{if this.isSubscribed "-ml-1" "-ml-1"}}
          />
          {{if this.isSubscribed "Subscribed" "Subscribe"}}
        </div>
      </Action>
      {{#if @hasTooltip}}
        <TooltipIcon
          data-test-subscription-toggle-tooltip-icon
          @text={{this.tooltipText}}
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
