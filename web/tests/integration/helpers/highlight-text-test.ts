import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";

module("Integration | Helper | highlight-text", function (hooks) {
  setupRenderingTest(hooks);

  test("it highlights text that matches a query", async function (assert) {
    await render(hbs`
      <div>{{highlight-text "Hello, world!" "world"}}</div>
    `);

    assert.dom().hasText("Hello, world!");
    assert.dom("mark").hasText("world");
  });
});
