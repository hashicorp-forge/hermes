import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { hbs } from "ember-cli-htmlbars";
import { click, render, waitFor } from "@ember/test-helpers";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import { task } from "ember-concurrency";

interface SubscriptionListItemContext extends MirageTestContext {
  productArea: string;
}

module(
  "Integration | Component | settings/subscription-list-item",
  function (hooks) {
    setupRenderingTest(hooks);
    setupMirage(hooks);

    hooks.beforeEach(function () {
      const authenticatedUser = this.owner.lookup(
        "service:authenticated-user"
      ) as AuthenticatedUserService;
      authenticatedUser.subscriptions = [];
    });

    test("it renders and can be toggled", async function (this: SubscriptionListItemContext, assert) {
      this.set("productArea", "Waypoint");

      await render(hbs`
        {{! @glint-nocheck: not typesafe yet }}
        <Settings::SubscriptionListItem
          @productArea={{this.productArea}}
        />
      `);

      assert.dom(".subscription-list-item").exists();
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

    test("it shows a temporary message when toggled", async function (assert) {
      this.set("productArea", "Waypoint");

      await render(hbs`
        {{! @glint-nocheck: not typesafe yet }}
        <Settings::SubscriptionListItem
          @productArea={{this.productArea}}
        />
      `);

      let promise = click('.hds-form-toggle input[type="checkbox"]');

      assert.dom(".subscription-list-popover").doesNotExist();
      await waitFor(".subscription-list-popover");

      assert.dom(".subscription-list-popover").exists().hasText("Subscribed");

      await promise;

      assert
        .dom(".subscription-list-popover")
        .doesNotExist("it hides the popover after a timeout");

      promise = click('.hds-form-toggle input[type="checkbox"]');

      await waitFor(".subscription-list-popover");
      assert.dom(".subscription-list-popover").hasText("Unsubscribed");

      await promise;
    });
  }
);
