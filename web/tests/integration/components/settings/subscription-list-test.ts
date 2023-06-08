import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { hbs } from "ember-cli-htmlbars";
import { fillIn, render } from "@ember/test-helpers";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";

interface SubscriptionListItemContext extends MirageTestContext {
  allProductAreas: string[];
}

module(
  "Integration | Component | settings/subscription-list",
  function (hooks) {
    setupRenderingTest(hooks);
    setupMirage(hooks);

    hooks.beforeEach(function () {
      const authenticatedUser = this.owner.lookup(
        "service:authenticated-user"
      ) as AuthenticatedUserService;
      authenticatedUser.subscriptions = [];
    });

    test("it renders a filterable subscription list", async function (this: SubscriptionListItemContext, assert) {
      await render(hbs`
        {{! @glint-nocheck: not typesafe yet }}
        <Settings::SubscriptionList
          @allProductAreas={{array 'one' 'two' 'three'}}
        />
      `);

      assert.dom("[data-test-subscription-list]").exists();
      assert.dom(".subscription-list-item").exists({ count: 3 });

      await fillIn("[data-test-subscription-list-filter-input]", "one");

      assert
        .dom(".subscription-list-item")
        .exists({ count: 1 })
        .hasText("one", "it filters the list");

      await fillIn("[data-test-subscription-list-filter-input]", "t");
      assert.dom(".subscription-list-item").exists({ count: 2 });
      assert.dom("li:nth-child(1)").hasText("two");
      assert.dom("li:nth-child(2)").hasText("three");
    });
  }
);
