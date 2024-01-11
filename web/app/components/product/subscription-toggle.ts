import Component from "@glimmer/component";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import { HermesSize } from "hermes/types/sizes";
import { SubscriptionType } from "hermes/services/authenticated-user";
import { assert } from "@ember/debug";
import { Placement } from "@floating-ui/dom";
import { emptyTransition } from "hermes/utils/ember-animated/empty-transition";
import { tracked } from "@glimmer/tracking";
import { TransitionContext } from "ember-animated/.";
import { fadeIn, fadeOut } from "ember-animated/motions/opacity";
import move from "ember-animated/motions/move";
import { easeOutExpo } from "hermes/utils/ember-animated/easings";
import { TransitionRules } from "ember-animated/transition-rules";

interface ProductSubscriptionToggleComponentSignature {
  Element: HTMLDivElement;
  Args: {
    product: string;
    size?: `${HermesSize.Small}`;
    popoverPlacement?: Placement;
  };
}

type SubscriptionOption = {
  type: SubscriptionType | undefined;
  label: string;
  description: string;
};

export default class ProductSubscriptionToggleComponent extends Component<ProductSubscriptionToggleComponentSignature> {
  @service declare authenticatedUser: AuthenticatedUserService;

  @tracked protected shouldAnimate = false;

  @tracked selectionIndex = 0;

  protected get selectedSubscription() {
    console.log("get selectedSubscription");

    const { subscriptions } = this.authenticatedUser;

    assert("subscriptions must exist", subscriptions);

    return subscriptions.find(
      (subscription) => subscription.productArea === this.args.product,
    );
  }

  protected get label() {
    // find the label for the selected subscription
    return this.subscriptionTypes.find(
      (subscriptionType) =>
        subscriptionType.type === this.selectedSubscription?.subscriptionType,
    )?.label;
  }

  protected get type() {
    // find the label for the selected subscription
    return this.subscriptionTypes.find(
      (subscriptionType) =>
        subscriptionType.type === this.selectedSubscription?.subscriptionType,
    )?.type;
  }

  protected get subscriptionTypes() {
    return [
      {
        type: SubscriptionType.Instant,
        label: "All updates",
        description: "Get notified when a doc is published",
      },
      {
        type: SubscriptionType.Digest,
        label: "Digest",
        description: "Get a weekly summary of new docs",
      },
      {
        type: undefined,
        label: "Unsubscribed",
        description: "Don't get emails about this product/area",
      },
    ];
  }

  @action protected enableAnimation() {
    this.shouldAnimate = true;

    this.selectionIndex = this.subscriptionTypes.findIndex(
      (subscriptionType) => subscriptionType.type === this.type,
    );
  }

  @tracked animationDirection = "static"; // needs to be set better

  @action setSubscription(index: number, attrs: SubscriptionOption) {
    if (this.selectionIndex > index) {
      this.animationDirection = "up";
    } else if (this.selectionIndex < index) {
      this.animationDirection = "down";
    } else {
      this.animationDirection = "static";
    }

    this.selectionIndex = index;

    void this.authenticatedUser.setSubscription.perform(
      this.args.product,
      attrs.type,
    );
  }

  @action protected iconTransitionRules({
    oldItems,
    newItems,
  }: TransitionRules) {
    if (!this.shouldAnimate) {
      return emptyTransition;
    } else {
      console.log("iconTransitionRules", {
        oldItems: oldItems[0],
        newItems: newItems[0],
      });

      if (this.animationDirection === "up") {
        return this.subscribeTransition;
      } else {
        return this.unsubscribeTransition;
      }
    }
  }

  *unsubscribeTransition({
    insertedSprites,
    removedSprites,
  }: TransitionContext) {
    for (const sprite of removedSprites) {
      sprite.endTranslatedBy(0, 10);
      void move(sprite, { duration: 200, easing: easeOutExpo });
      void fadeOut(sprite, { duration: 60 });
    }

    for (const sprite of insertedSprites) {
      sprite.startTranslatedBy(0, -10);
      void fadeIn(sprite, { duration: 60 });
      void move(sprite, { duration: 200, easing: easeOutExpo });
    }
  }

  *subscribeTransition({ insertedSprites, removedSprites }: TransitionContext) {
    for (const sprite of removedSprites) {
      sprite.endTranslatedBy(0, -10);
      void move(sprite, { duration: 200, easing: easeOutExpo });
      void fadeOut(sprite, { duration: 60 });
    }

    for (const sprite of insertedSprites) {
      sprite.startTranslatedBy(0, 10);
      void fadeIn(sprite, { duration: 60 });
      void move(sprite, { duration: 200, easing: easeOutExpo });
    }
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Product::SubscriptionToggle": typeof ProductSubscriptionToggleComponent;
  }
}
