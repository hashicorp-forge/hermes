import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { hbs } from "ember-cli-htmlbars";
import { click, render } from "@ember/test-helpers";

module(
  "Integration | Component | settings/subscription-list-item",
  function (hooks) {
    setupRenderingTest(hooks);

    test("it renders and can be toggled", async function (assert) {
      this.set("productArea", "Waypoint");

      await render(hbs`
        <Settings::SubscriptionListItem
          @productArea={{this.productArea}}
        />
      `);

      assert.dom("[data-test-subscription-list-item]").exists();
      assert
        .dom(".flight-icon-waypoint-color")
        .exists("it shows the product logo if there is one");
      assert.dom("[data-test-subscription-list-item-name]").hasText("Waypoint");
      assert.dom(".hds-form-toggle").exists();
      assert.dom('.hds-form-toggle input[type="checkbox"]').isNotChecked();

      await click('.hds-form-toggle input[type="checkbox"]');
      assert.dom('.hds-form-toggle input[type="checkbox"]').isChecked();

      this.set("productArea", "Labs");
      assert
        .dom(".flight-icon-folder")
        .exists("it shows a folder icon if there is no product logo");
      assert.dom("[data-test-subscription-list-item-name]").hasText("Labs");
      assert.dom('.hds-form-toggle input[type="checkbox"]').isNotChecked();

      this.set("productArea", "Waypoint");
      assert.dom('.hds-form-toggle input[type="checkbox"]').isChecked();
    });
  }
);
