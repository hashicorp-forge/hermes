import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { hbs } from "ember-cli-htmlbars";
import { click, render, triggerEvent } from "@ember/test-helpers";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import { setupProductIndex } from "hermes/tests/mirage-helpers/utils";
import { HermesSize } from "hermes/types/sizes";
import {
  IS_SUBSCRIBED_TOOLTIP_TEXT,
  NOT_SUBSCRIBED_TOOLTIP_TEXT,
} from "hermes/utils/tooltip-text";

const ICON = "[data-test-product-avatar]";
const NAME = "[data-test-subscription-list-item-link]";
const BUTTON = "[data-test-product-subscription-toggle]";
const TOOLTIP_ICON = "[data-test-subscription-toggle-tooltip-icon]";
const TOOLTIP = ".hermes-tooltip";

interface ProductSubscriptionToggleComponentContext extends MirageTestContext {
  product: string;
  hasTooltip: boolean;
  size: `${HermesSize.Small}`;
}

module(
  "Integration | Component | product/subscription-toggle",
  function (hooks) {
    setupRenderingTest(hooks);
    setupMirage(hooks);

    hooks.beforeEach(async function (
      this: ProductSubscriptionToggleComponentContext,
    ) {
      const authenticatedUser = this.owner.lookup(
        "service:authenticated-user",
      ) as AuthenticatedUserService;
      authenticatedUser.subscriptions = [];

      this.server.create("product", { name: "Waypoint" });
      this.server.create("product", { name: "Labs", abbreviation: "LAB" });

      await setupProductIndex(this);
    });

    test("it renders and can be toggled", async function (this: ProductSubscriptionToggleComponentContext, assert) {
      this.set("product", "Waypoint");

      await render<ProductSubscriptionToggleComponentContext>(hbs`
        <Product::SubscriptionToggle
          @product={{this.product}}
        />
      `);

      assert
        .dom(BUTTON)
        .hasClass("hds-button--color-secondary")
        .doesNotHaveAttribute("data-test-subscribed")
        .hasText("Subscribe");

      assert
        .dom(BUTTON + ` .flight-icon`)
        .hasAttribute("data-test-icon", "plus");

      const authenticatedUser = this.owner.lookup(
        "service:authenticated-user",
      ) as AuthenticatedUserService;

      assert.equal(authenticatedUser.subscriptions?.length, 0);

      await click(BUTTON);

      assert
        .dom(BUTTON)
        .hasAttribute("data-test-subscribed")
        .hasText("Subscribed");

      assert.equal(authenticatedUser.subscriptions?.length, 1);
      assert.equal(
        authenticatedUser.subscriptions?.[0]?.productArea,
        "Waypoint",
      );

      await click(BUTTON);

      assert
        .dom(BUTTON)
        .doesNotHaveAttribute("data-test-subscribed")
        .hasText("Subscribe");

      assert.equal(authenticatedUser.subscriptions?.length, 0);
    });

    test("it can render with a tooltip", async function (this: ProductSubscriptionToggleComponentContext, assert) {
      this.set("product", "Waypoint");
      this.set("hasTooltip", false);

      await render<ProductSubscriptionToggleComponentContext>(hbs`
        <Product::SubscriptionToggle
          @product={{this.product}}
          @hasTooltip={{this.hasTooltip}}
        />
      `);

      assert.dom(TOOLTIP_ICON).doesNotExist();

      this.set("hasTooltip", true);

      assert.dom(TOOLTIP_ICON).exists();

      await triggerEvent(TOOLTIP_ICON, "mouseenter");

      assert.dom(TOOLTIP).hasText(NOT_SUBSCRIBED_TOOLTIP_TEXT);

      await click(BUTTON);

      await triggerEvent(TOOLTIP_ICON, "mouseenter");

      assert.dom(TOOLTIP).hasText(IS_SUBSCRIBED_TOOLTIP_TEXT);
    });

    test("it can render at different sizes", async function (this: ProductSubscriptionToggleComponentContext, assert) {
      this.set("productArea", "Waypoint");
      this.set("size", undefined);

      await render<ProductSubscriptionToggleComponentContext>(hbs`
        <Product::SubscriptionToggle
          @product={{this.product}}
          @size={{this.size}}
        />
      `);

      assert.dom(BUTTON).hasClass("h-9");

      this.set("size", "small");

      assert.dom(BUTTON).hasClass("h-7");
    });
  },
);
