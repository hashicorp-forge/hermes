import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { hbs } from "ember-cli-htmlbars";
import { click, render } from "@ember/test-helpers";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import { setupProductIndex } from "hermes/tests/mirage-helpers/utils";

const ICON = "[data-test-product-avatar]";
const NAME = "[data-test-subscription-list-item-link]";
const BUTTON = "[data-test-product-subscription-toggle]";
const LIST_ITEM = "[data-test-subscription-list-item]";

interface ProductSubscriptionToggleComponentContext extends MirageTestContext {
  productArea: string;
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
      this.set("productArea", "Waypoint");

      await render<ProductSubscriptionToggleComponentContext>(hbs`
        <Settings::SubscriptionListItem
          @productArea={{this.productArea}}
        />
      `);

      assert.dom(LIST_ITEM).exists();
      assert.dom(ICON).exists("it shows the product icon if there is one");
      assert
        .dom(NAME)
        .hasText("Waypoint")
        .hasAttribute(
          "href",
          "/documents?product=%5B%22Waypoint%22%5D",
          "the name is clickable to the product filter screen",
        );

      assert
        .dom(BUTTON)
        .doesNotHaveAttribute("data-test-subscribed")
        .hasText("Subscribe");

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
  },
);
