import Component from "@glimmer/component";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import { HermesSize } from "hermes/types/sizes";
import FlightIcon from "@hashicorp/ember-flight-icons/components/flight-icon";
import XDropdownList from "hermes/components/x/dropdown-list/index";
import { SubscriptionType } from "hermes/services/authenticated-user";
import CheckableItem from "hermes/components/x/dropdown-list/checkable-item";
import { assert } from "@ember/debug";
import eq from "ember-truth-helpers/helpers/eq";
import or from "ember-truth-helpers/helpers/or";
import { Placement } from "@floating-ui/dom";
import AnimatedValue from "ember-animated/components/animated-value";
import { emptyTransition } from "hermes/utils/ember-animated/empty-transition";
import { tracked } from "@glimmer/tracking";
import { TransitionContext, wait } from "ember-animated/.";
import { fadeIn, fadeOut } from "ember-animated/motions/opacity";
import move from "ember-animated/motions/move";
import {
  easeOutBack,
  easeOutExpo,
  easeOutQuad,
} from "hermes/utils/ember-animated/easings";
import { restartableTask } from "ember-concurrency";
import animateTransform from "hermes/utils/ember-animated/animate-transform";

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
    console.log("getter computing");
    const subscriptions = this.authenticatedUser.subscriptions;
    assert("subscriptions must exist", subscriptions);
    // see if the user is subscribed to this product
    const subscription = subscriptions.find(
      (subscription) => subscription.productArea === this.args.product,
    );

    if (subscription) {
      const subscriptionOption = this.subscriptionTypes.find(
        (subscriptionType) =>
          subscriptionType.type === subscription.subscriptionType,
      );

      assert("subscriptionOption must exist", subscriptionOption);

      return subscriptionOption;
    }
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

    // this should set the animation direction and selection index
    // based on the current subscription

    console.log("before", this.selectionIndex);

    this.selectionIndex = this.subscriptionTypes.findIndex(
      (subscriptionType) =>
        subscriptionType.type === this.selectedSubscription?.type,
    );
    console.log("after", this.selectionIndex);
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
    // @ts-ignore
    oldItems,
    // @ts-ignore
    newItems,
  }) {
    if (!this.shouldAnimate) {
      return emptyTransition;
    } else {
      if (this.animationDirection === "up") {
        return this.subscribeTransition;
      } else if (this.animationDirection === "down") {
        return this.unsubscribeTransition;
      }

      return this.wiggleIconTransition;
    }
  }

  *wiggleIconTransition({
    insertedSprites,
    removedSprites,
  }: TransitionContext) {
    for (const sprite of removedSprites) {
      sprite.hide();
    }

    for (const sprite of insertedSprites) {
      sprite.reveal();
      animateTransform(sprite, {
        rotate: {
          to: 360,
        },
        duration: 250,
        easing: easeOutBack,
      });
    }
  }

  *unsubscribeTransition({
    insertedSprites,
    removedSprites,
  }: TransitionContext) {
    // this will be the same as iconTransition, but in the opposite direction
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
