import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { hbs } from "ember-cli-htmlbars";
import { click, render, waitFor } from "@ember/test-helpers";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import { setupProductIndex } from "hermes/tests/mirage-helpers/utils";

const ABBREVIATION = "[data-test-product-abbreviation]";
const ICON = "[data-test-product-avatar]";
const NAME = "[data-test-subscription-list-item-name]";
const CHECKBOX = '.hds-form-toggle input[type="checkbox"]';
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
      this.server.create("product", { name: "Labs", abbreviation: "LAB" });

      await setupProductIndex(this);
    });

    test("it renders and can be toggled", async function (this: SubscriptionListItemContext, assert) {
      this.set("productArea", "Waypoint");

      await render(hbs`
        {{! @glint-nocheck: not typesafe yet }}
        <Settings::SubscriptionListItem
          @productArea={{this.productArea}}
        />
      `);

      assert.dom(LIST_ITEM).exists();
      assert.dom(ICON).exists("it shows the product icon if there is one");
      assert.dom(NAME).hasText("Waypoint");
      assert.dom(CHECKBOX).isNotChecked();

      await click(CHECKBOX);
      assert.dom(CHECKBOX).isChecked();

      this.set("productArea", "Labs");
      assert
        .dom(ABBREVIATION)
        .exists("it shows an abbreviation if there is no product logo");
      assert.dom(NAME).hasText("Labs");
      assert.dom(CHECKBOX).isNotChecked();

      this.set("productArea", "Waypoint");
      assert.dom(CHECKBOX).isChecked();
    });
  },
);
