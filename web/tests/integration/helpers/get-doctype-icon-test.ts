import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";

module("Integration | Helper | get-doctype-icon", function (hooks) {
  setupRenderingTest(hooks);

  test("it returns the expected values", async function (assert) {
    await render(hbs`
      {{get-doctype-icon "RFC"}}
      {{get-doctype-icon "PRD"}}
      {{get-doctype-icon "FRD"}}
      {{get-doctype-icon "MEMO"}}
      {{get-doctype-icon "FOO"}}
    `);

    const expectedValues = [
      "discussion-circle",
      "target",
      "dollar-sign",
      "radio",
      "file-text",
    ];

    assert.deepEqual(
      this.element.textContent?.trim().split(/\s+/),
      expectedValues,
    );
  });
});
