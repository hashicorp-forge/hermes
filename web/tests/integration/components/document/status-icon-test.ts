import { TestContext } from "@ember/test-helpers";
import { setupRenderingTest } from "ember-qunit";
import { module, test } from "qunit";

interface Context extends TestContext {}

module("Integration | Component | document/status-icon", function (hooks) {
  setupRenderingTest(hooks);

  test("it renders correctly based on status", async function (assert) {
    assert.true(false);
  });
});
