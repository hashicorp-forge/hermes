import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { click, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { setupWindowMock } from "ember-window-mock/test-support";
import window from "ember-window-mock";
import { NEW_FEATURES_BANNER_LOCAL_STORAGE_ITEM } from "hermes/components/dashboard/new-features-banner";

const BANNER_SELECTOR = "[data-test-new-features-banner]";

module(
  "Integration | Component | dashboard/new-features-banner",
  function (hooks) {
    setupRenderingTest(hooks);
    setupWindowMock(hooks);

    test("it can be dismissed", async function (assert) {
      window.localStorage.removeItem(NEW_FEATURES_BANNER_LOCAL_STORAGE_ITEM);

      await render(hbs`
        <Dashboard::NewFeaturesBanner />
      `);

      assert.equal(
        window.localStorage.getItem(NEW_FEATURES_BANNER_LOCAL_STORAGE_ITEM),
        "true",
        "a local storage item is set"
      );

      assert.dom(BANNER_SELECTOR).exists();

      await click(`${BANNER_SELECTOR} .hds-dismiss-button`);

      assert.dom(BANNER_SELECTOR).doesNotExist();
      assert.equal(
        window.localStorage.getItem(NEW_FEATURES_BANNER_LOCAL_STORAGE_ITEM),
        "false",
        "the local storage item is set to false"
      );
    });

    test("it is not shown if the local storage item is set to false", async function (assert) {
      window.localStorage.setItem(
        NEW_FEATURES_BANNER_LOCAL_STORAGE_ITEM,
        "false"
      );

      await render(hbs`
        <Dashboard::NewFeaturesBanner />
      `);

      assert.dom(BANNER_SELECTOR).doesNotExist();
    });
  }
);
