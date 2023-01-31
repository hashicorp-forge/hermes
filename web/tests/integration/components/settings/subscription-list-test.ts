import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { hbs } from "ember-cli-htmlbars";
import { click, fillIn, render } from "@ember/test-helpers";

module(
  "Integration | Component | settings/subscription-list",
  function (hooks) {
    setupRenderingTest(hooks);

    test("it renders a filterable subscription list", async function (assert) {
      await render(hbs`
        <Settings::SubscriptionList
          @allProductAreas={{array 'one' 'two' 'three'}}
        />
      `);

      assert.dom("[data-test-subscription-list]").exists();
      assert.dom("[data-test-subscription-list-item]").exists({ count: 3 });

      await fillIn("[data-test-subscription-list-filter-input]", "one");

      assert
        .dom("[data-test-subscription-list-item]")
        .exists({ count: 1 })
        .hasText("one", "it filters the list");

      await fillIn("[data-test-subscription-list-filter-input]", "t");
      assert.dom('[data-test-subscription-list-item]').exists({ count: 2 })
      assert.dom('li:nth-child(1)').hasText('two')
      assert.dom('li:nth-child(2)').hasText('three')
    });
  }
);
