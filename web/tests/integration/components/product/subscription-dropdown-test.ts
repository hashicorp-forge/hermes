import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { hbs } from "ember-cli-htmlbars";
import { click, findAll, render, triggerEvent } from "@ember/test-helpers";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import AuthenticatedUserService, {
  SubscriptionType,
} from "hermes/services/authenticated-user";
import { setupProductIndex } from "hermes/tests/mirage-helpers/utils";
import { HermesSize } from "hermes/types/sizes";
import {
  AnimationDirection,
  SubscriptionDescription,
  SubscriptionLabel,
} from "hermes/components/product/subscription-dropdown";
import { assert as emberAssert } from "@ember/debug";

const BUTTON = "[data-test-subscription-dropdown-toggle]";
const ICON = `${BUTTON} [data-test-toggle-icon]`;
const SUBSCRIPTION_OPTION = "[data-test-subscription-option]";
const SUBSCRIPTION_OPTION_LABEL = `${SUBSCRIPTION_OPTION} [data-test-label]`;
const SUBSCRIPTION_OPTION_DESCRIPTION = `${SUBSCRIPTION_OPTION} [data-test-description]`;
const ANIMATED_CONTAINER = `${BUTTON} [data-test-container]`;

interface ProductSubscriptionDropdownComponentContext
  extends MirageTestContext {
  product: string;
  hasTooltip: boolean;
  size: `${HermesSize.Small}`;
}

module(
  "Integration | Component | product/subscription-dropdown",
  function (hooks) {
    setupRenderingTest(hooks);
    setupMirage(hooks);

    hooks.beforeEach(async function (
      this: ProductSubscriptionDropdownComponentContext,
    ) {
      const authenticatedUser = this.owner.lookup(
        "service:authenticated-user",
      ) as AuthenticatedUserService;
      authenticatedUser.subscriptions = [];

      this.server.create("product", { name: "Waypoint" });
      this.server.create("product", { name: "Labs", abbreviation: "LAB" });

      await setupProductIndex(this);
    });

    test("the button renders in small and medium sizes", async function (this: ProductSubscriptionDropdownComponentContext, assert) {
      this.set("size", undefined);

      await render<ProductSubscriptionDropdownComponentContext>(hbs`
        <Product::SubscriptionDropdown
          @product={{this.product}}
          @size={{this.size}}
        />
      `);

      assert
        .dom(BUTTON)
        .hasClass("hds-button--size-medium", "renders medium by default");

      // confirm the small size is applied
      this.set("size", "small");

      assert.dom(BUTTON).hasClass("hds-button--size-small");
    });

    test("the popover shows subscription options", async function (this: ProductSubscriptionDropdownComponentContext, assert) {
      await render<ProductSubscriptionDropdownComponentContext>(hbs`
        <Product::SubscriptionDropdown
          @product="Waypoint"
        />
      `);

      await click(BUTTON);

      assert.dom(SUBSCRIPTION_OPTION).exists({ count: 3 });

      const expectedLabels = [
        SubscriptionLabel.Instant,
        SubscriptionLabel.Digest,
        SubscriptionLabel.Unsubscribed,
      ];

      const expectedDescriptions = [
        SubscriptionDescription.Instant,
        SubscriptionDescription.Digest,
        SubscriptionDescription.Unsubscribed,
      ];

      let expectedIsSelectedValues = [false, false, true];

      // assert that the labels and descriptions are correct
      assert.deepEqual(
        findAll(SUBSCRIPTION_OPTION_LABEL).map((el) => el.textContent?.trim()),
        expectedLabels,
      );

      // assert that the descriptions are correct
      assert.deepEqual(
        findAll(SUBSCRIPTION_OPTION_DESCRIPTION).map(
          (el) => el.textContent?.trim(),
        ),
        expectedDescriptions,
      );

      // assert that the checkmark is on the unsubscribed option

      assert.deepEqual(
        findAll(SUBSCRIPTION_OPTION).map(
          (el) => el.getAttribute("data-test-is-selected") !== null,
        ),
        expectedIsSelectedValues,
      );

      // subscribe to instant notifications

      const instantOption = findAll(SUBSCRIPTION_OPTION)[0];
      emberAssert("instant option must exist", instantOption);

      await click(instantOption);

      // reopen the dropdown

      await click(BUTTON);

      // assert that the checkmark is now on the instant option

      expectedIsSelectedValues = [true, false, false];

      assert.deepEqual(
        findAll(SUBSCRIPTION_OPTION).map(
          (el) => el.getAttribute("data-test-is-selected") !== null,
        ),
        expectedIsSelectedValues,
      );

      // subscribe to digest notifications

      const digestOption = findAll(SUBSCRIPTION_OPTION)[1];
      emberAssert("digest option must exist", digestOption);

      await click(digestOption);

      // reopen the dropdown

      await click(BUTTON);

      // assert that the checkmark is now on the digest option

      expectedIsSelectedValues = [false, true, false];

      assert.deepEqual(
        findAll(SUBSCRIPTION_OPTION).map(
          (el) => el.getAttribute("data-test-is-selected") !== null,
        ),
        expectedIsSelectedValues,
      );
    });

    test("you can change your subscription", async function (this: ProductSubscriptionDropdownComponentContext, assert) {
      await render<ProductSubscriptionDropdownComponentContext>(hbs`
        <Product::SubscriptionDropdown
          @product="Waypoint"
        />
      `);

      assert
        .dom(BUTTON)
        .hasClass(
          "hds-button--color-secondary",
          "the subscribe button is shown in the secondary color",
        )
        .hasAttribute("data-test-subscription", "none")
        .hasText("Subscribe");

      assert.dom(ICON).hasAttribute("data-test-icon", "plus");

      await click(BUTTON);

      // subscribe to instant notifications
      await click(SUBSCRIPTION_OPTION);

      const authenticatedUser = this.owner.lookup(
        "service:authenticated-user",
      ) as AuthenticatedUserService;

      assert.equal(
        authenticatedUser.subscriptions?.[0]?.subscriptionType,
        SubscriptionType.Instant,
      );

      assert
        .dom(BUTTON)
        .hasClass(
          "hds-button--color-primary",
          "button uses primary color when subscribed",
        )
        .hasAttribute("data-test-subscription", "instant")
        .hasText(SubscriptionLabel.Instant);

      assert.dom(ICON).hasAttribute("data-test-icon", "check");

      // reopen the dropdown
      await click(BUTTON);

      // subscribe to digest notifications
      const digestOption = findAll(SUBSCRIPTION_OPTION)[1];
      emberAssert("digest option must exist", digestOption);
      await click(digestOption);

      assert.equal(
        authenticatedUser.subscriptions?.[0]?.subscriptionType,
        SubscriptionType.Digest,
      );

      assert
        .dom(BUTTON)
        .hasClass(
          "hds-button--color-primary",
          "button uses primary color when subscribed",
        )
        .hasAttribute("data-test-subscription", "digest")
        .hasText(SubscriptionLabel.Digest);

      // reopen the dropdown
      await click(BUTTON);

      // unsubscribe
      const unsubscribeOption = findAll(SUBSCRIPTION_OPTION)[2];
      emberAssert("unsubscribe option must exist", unsubscribeOption);
      await click(unsubscribeOption);

      assert.equal(authenticatedUser.subscriptions?.length, 0);
    });

    test("the animation properties are set correctly when the subscription changes", async function (this: ProductSubscriptionDropdownComponentContext, assert) {
      await render<ProductSubscriptionDropdownComponentContext>(hbs`
        <Product::SubscriptionDropdown
          @product="Waypoint"
        />
      `);

      let instantOption,
        digestOption,
        unsubscribeOption: Element | undefined = undefined;

      const captureOptions = () => {
        instantOption = findAll(SUBSCRIPTION_OPTION)[0];
        digestOption = findAll(SUBSCRIPTION_OPTION)[1];
        unsubscribeOption = findAll(SUBSCRIPTION_OPTION)[2];
      };

      const selectionIndex = "data-test-selection-index";
      const animationDirection = "data-test-animation-direction";

      const instantIndex = "0";
      const digestIndex = "1";
      const unsubscribedIndex = "2";

      assert
        .dom(ANIMATED_CONTAINER)
        .hasAttribute(selectionIndex, unsubscribedIndex);

      // unsubscribe -> instant

      await click(BUTTON);

      captureOptions();
      emberAssert("instant option must exist", instantOption);

      await click(instantOption);

      assert
        .dom(ANIMATED_CONTAINER)
        .hasAttribute(selectionIndex, instantIndex)
        .hasAttribute(animationDirection, AnimationDirection.Up);

      // instant -> unsubscribe
      await click(BUTTON);

      captureOptions();
      emberAssert("unsubscribe option must exist", unsubscribeOption);

      await click(unsubscribeOption);

      assert
        .dom(ANIMATED_CONTAINER)
        .hasAttribute(selectionIndex, unsubscribedIndex)
        .hasAttribute(animationDirection, AnimationDirection.Down);

      // unsubscribe -> digest

      await click(BUTTON);

      captureOptions();
      emberAssert("digest option must exist", digestOption);

      await click(digestOption);

      assert
        .dom(ANIMATED_CONTAINER)
        .hasAttribute(selectionIndex, digestIndex)
        .hasAttribute(animationDirection, AnimationDirection.Up);

      // digest -> instant

      await click(BUTTON);

      captureOptions();
      emberAssert("instant option must exist", instantOption);

      await click(instantOption);

      assert
        .dom(ANIMATED_CONTAINER)
        .hasAttribute(selectionIndex, instantIndex)
        .hasAttribute(animationDirection, AnimationDirection.Up);

      // instant -> digest

      await click(BUTTON);

      captureOptions();
      emberAssert("digest option must exist", digestOption);

      await click(digestOption);

      assert
        .dom(ANIMATED_CONTAINER)
        .hasAttribute(selectionIndex, digestIndex)
        .hasAttribute(animationDirection, AnimationDirection.Down);
    });
  },
);
