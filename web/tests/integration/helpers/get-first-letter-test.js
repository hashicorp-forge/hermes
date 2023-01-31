import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";

module("Integration | Helper | get-first-letter", function (hooks) {
  setupRenderingTest(hooks);

  test("it returns first letter", async function (assert) {
    this.set("value", "HashiCorp");

    await render(hbs`
    <div class="character">
      {{get-first-letter this.value}}
    </div>
    `);

    assert.dom(".character").hasText("H");

    this.set("value", "#1 Engineer");

    assert.dom(".character").hasText("E");

    this.set("value", undefined);
    assert.dom(".character").hasText("");

    this.set("value", null);
    assert.dom(".character").hasText("");

    this.set("value", 500);
    assert.dom(".character").hasText("");

    this.set("value", { key: "value" });
    assert.dom(".character").hasText("");
  });
});
