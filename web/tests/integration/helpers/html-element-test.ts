import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";

module("Integration | Helper | html-element", function (hooks) {
  setupRenderingTest(hooks);

  test("it works as expected", async function (assert) {
    await render(hbs`
      {{! @glint-nocheck: not typesafe yet }}
      <div class="container"></div>

      {{#in-element (html-element ".container")}}
        <div class="content">
          Like magic
        </div>
      {{/in-element}}
    `);

    assert.dom(".container .content").hasText("Like magic");
  });
});
