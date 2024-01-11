import Component from "@glimmer/component";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";
import AuthenticatedUserService, {
  Subscription,
} from "hermes/services/authenticated-user";
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

interface ProductSubscriptionDropdownComponentSignature {
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

enum AnimationDirection {
  UP = "up",
  DOWN = "down",
}

const ICON_MOVE_DISTANCE = 10;
const ICON_MOVE_DURATION = 200;
const ICON_FADE_DURATION = 60;

export default class ProductSubscriptionDropdownComponent extends Component<ProductSubscriptionDropdownComponentSignature> {
  @service declare authenticatedUser: AuthenticatedUserService;

  /**
   * The direction of the animation.
   * Set by `setSubscription` according to the `selectionIndex`
   * values before and after the change; used by `iconTransitionRules`
   * on initial render and when a subscription is changed.
   */
  @tracked private animationDirection: AnimationDirection | null = null;

  /**
   * The index of the selected item within the options array.
   * Used to determine which animation direction to use.
   * If the new item is above the previous selection,
   * the animation should move up and vice versa.
   */
  @tracked private selectionIndex = 0;

  /**
   * The user's current subscription for the product.
   * Passed to the DropdownList as the `selected` property,
   * which determines the toggle color.
   */
  protected get currentSubscription(): Subscription | undefined {
    const { subscriptions } = this.authenticatedUser;

    /**
     * We assert instead of using a `?.find()` construction not just because we
     * expect subscriptions to exist, but to avoid confusion as to whether an
     * `undefined` value is intentional (user is not subscribed) or not
     * (the subscriptions array was erroneously null).
     */
    assert("subscriptions must exist", subscriptions);

    return subscriptions.find(
      (subscription) => subscription.productArea === this.args.product,
    );
  }

  /**
   * The label of the dropdown toggle.
   * Used to display the current subscription type
   * and to determine which dropdown item is checked.
   */
  protected get label(): string {
    const subscription = this.options.find(
      (subscriptionType) =>
        subscriptionType.type === this.currentSubscription?.subscriptionType,
    );

    assert("subscription must exist", subscription);

    return subscription.label;
  }

  /**
   * The subscription type of the current subscription, if one exists.
   * Used as a trigger for `AnimatedValue` and to determine
   * whether the toggle shows the SubscriptionType label or "Subscribe."
   */
  protected get type(): SubscriptionType | undefined {
    return this.options.find(
      (subscriptionType) =>
        subscriptionType.type === this.currentSubscription?.subscriptionType,
    )?.type;
  }

  /**
   * The list of available subscription types.
   * Passed to the DropdownList as the `items` property
   * and used as a reference for subscription metadata.
   */
  protected get options() {
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

  /**
   * The action to set the selectionIndex of the current subscription.
   * Runs when the dropdown toggle is inserted. This essentially
   * enables animation after the initial render.
   */
  @action protected configureSelectionIndex() {
    this.selectionIndex = this.options.findIndex(
      (subscriptionType) => subscriptionType.type === this.type,
    );
  }

  /**
   * The action to set a new subscription for the product and update
   * the current `selectionIndex`. Called by the DropdownList on itemClick.
   * Uses the index values of the previous and new selections to determine
   * the animation direction, then calls the AuthenticatedUser's save task.
   */
  @action setSubscription(index: number, attrs: SubscriptionOption) {
    if (this.selectionIndex === index) {
      return;
    } else if (this.selectionIndex > index) {
      this.animationDirection = AnimationDirection.UP;
    } else {
      this.animationDirection = AnimationDirection.DOWN;
    }

    this.selectionIndex = index;

    void this.authenticatedUser.setSubscription.perform(
      this.args.product,
      attrs.type,
    );
  }

  /**
   * The rules by which the icon should animate. Called on initial render
   * and when the subscription type changes. If an `animationDirection`
   * is not set, such as on initial render, return an empty transition.
   * Otherwise, return the UP or DOWN transition based on the `animationDirection`.
   */
  @action protected iconTransitionRules() {
    if (!this.animationDirection) {
      return emptyTransition;
    } else {
      if (this.animationDirection === AnimationDirection.UP) {
        return this.upTransition;
      } else {
        return this.downTransition;
      }
    }
  }

  /**
   * The "down" animation for the icon. Called when the user selects
   * a subscription type that is below the previous selection in the list.
   */
  *downTransition({ insertedSprites, removedSprites }: TransitionContext) {
    for (const sprite of removedSprites) {
      sprite.endTranslatedBy(0, ICON_MOVE_DISTANCE);
      void move(sprite, { duration: ICON_MOVE_DURATION, easing: easeOutExpo });
      void fadeOut(sprite, { duration: ICON_FADE_DURATION });
    }

    for (const sprite of insertedSprites) {
      sprite.startTranslatedBy(0, -ICON_MOVE_DISTANCE);
      void move(sprite, { duration: ICON_FADE_DURATION, easing: easeOutExpo });
      void fadeIn(sprite, { duration: ICON_MOVE_DURATION });
    }
  }

  /**
   * The "up" animation for the icon. Called when the user selects
   * a subscription type that is above the previous selection in the list.
   */
  *upTransition({ insertedSprites, removedSprites }: TransitionContext) {
    for (const sprite of removedSprites) {
      sprite.endTranslatedBy(0, -ICON_MOVE_DISTANCE);
      void move(sprite, { duration: ICON_MOVE_DURATION, easing: easeOutExpo });
      void fadeOut(sprite, { duration: ICON_FADE_DURATION });
    }

    for (const sprite of insertedSprites) {
      sprite.startTranslatedBy(0, ICON_MOVE_DISTANCE);
      void move(sprite, { duration: ICON_MOVE_DURATION, easing: easeOutExpo });
      void fadeIn(sprite, { duration: ICON_FADE_DURATION });
    }
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Product::SubscriptionDropdown": typeof ProductSubscriptionDropdownComponent;
  }
}
