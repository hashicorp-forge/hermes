import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";

module("Integration | Helper | multiply", function (hooks) {
  setupRenderingTest(hooks);

  test("it multiplies two numbers", async function (assert) {
    await render(hbs`
      {{multiply 5 10}} - {{multiply 1 10}} - {{multiply 10 10}}
    `);

    assert.dom().hasText("50 - 10 - 100");
  });
});
