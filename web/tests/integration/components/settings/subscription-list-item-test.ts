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

interface SubscriptionListItemContext extends MirageTestContext {
  productArea: string;
}

module(
  "Integration | Component | settings/subscription-list-item",
  function (hooks) {
    setupRenderingTest(hooks);
    setupMirage(hooks);

    hooks.beforeEach(async function (this: SubscriptionListItemContext) {
      const authenticatedUser = this.owner.lookup(
        "service:authenticated-user",
      ) as AuthenticatedUserService;
      authenticatedUser.subscriptions = [];

      this.server.create("product", { name: "Waypoint" });

      await setupProductIndex(this);
    });

    test("it renders and can be toggled", async function (this: SubscriptionListItemContext, assert) {
      this.set("productArea", "Waypoint");

      await render<SubscriptionListItemContext>(hbs`
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
          "/product-areas/waypoint",
          "the name is clickable to the product filter screen",
        );

      assert.dom(BUTTON).hasText("Subscribe");

      await click(BUTTON);

      assert.dom(BUTTON).hasText("Subscribed");
    });
  },
);
