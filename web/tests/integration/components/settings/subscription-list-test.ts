import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { hbs } from "ember-cli-htmlbars";
import { fillIn, render } from "@ember/test-helpers";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { setupProductIndex } from "hermes/tests/mirage-helpers/utils";

const LIST_ITEM = "[data-test-subscription-list-item]";

interface SubscriptionListItemContext extends MirageTestContext {
  allProductAreas: string[];
}

module(
  "Integration | Component | settings/subscription-list",
  function (hooks) {
    setupRenderingTest(hooks);
    setupMirage(hooks);

    hooks.beforeEach(async function (this: SubscriptionListItemContext) {
      const authenticatedUser = this.owner.lookup(
        "service:authenticated-user",
      ) as AuthenticatedUserService;
      authenticatedUser.subscriptions = [];

      await setupProductIndex(this);
    });

    test("it renders a filterable subscription list", async function (this: SubscriptionListItemContext, assert) {
      await render<SubscriptionListItemContext>(hbs`
        <Settings::SubscriptionList
          @allProductAreas={{array 'one' 'two' 'three'}}
        />
      `);

      assert.dom("[data-test-subscription-list]").exists();
      assert.dom(LIST_ITEM).exists({ count: 3 });

      await fillIn("[data-test-subscription-list-filter-input]", "one");

      assert
        .dom(LIST_ITEM)
        .exists({ count: 1 })
        .containsText("one", "it filters the list");

      await fillIn("[data-test-subscription-list-filter-input]", "t");
      assert.dom(LIST_ITEM).exists({ count: 2 });
      assert.dom("li:nth-child(1)").containsText("two");
      assert.dom("li:nth-child(2)").containsText("three");
    });
  },
);
