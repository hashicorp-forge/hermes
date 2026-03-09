import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";

module("Integration | Helper | lowercase", function (hooks) {
  setupRenderingTest(hooks);

  test("formats Word as word", async function (assert) {
    this.set("string", "Word");

    await render(hbs`{{lowercase this.string}}`);

    assert.equal(this.element.textContent.trim(), "word");
  });
});
