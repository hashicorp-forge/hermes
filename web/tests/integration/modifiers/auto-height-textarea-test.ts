import { fillIn, find, render } from "@ember/test-helpers";
import { module, test } from "qunit";
import { hbs } from "ember-cli-htmlbars";
import { setupRenderingTest } from "ember-qunit";
import { assert as emberAssert } from "@ember/debug";

module("Integration | Modifier | auto-height-textarea", function (hooks) {
  setupRenderingTest(hooks);

  test("it updates the height of the textarea", async function (assert) {
    await render(hbs`
      {{! @glint-nocheck: not typesafe yet }}
      <textarea {{auto-height-textarea}} rows="5" style="line-height: 16px" />
    `);

    const textarea = find("textarea");
    emberAssert("textarea must exist", textarea);

    assert.equal(textarea.getAttribute("rows"), "1");
    assert.true(textarea.style.resize === "none");

    let textareaHeight = textarea.clientHeight;

    await fillIn("textarea", "foo");

    assert.equal(textarea.clientHeight, textareaHeight);

    await fillIn("textarea", "foo\nbar");

    assert.equal(textarea.clientHeight, textareaHeight * 2);

    await fillIn("textarea", "foo\nbar\nbaz");

    assert.equal(textarea.clientHeight, textareaHeight * 3);

    await fillIn("textarea", "foo");

    assert.equal(textarea.clientHeight, textareaHeight);
  });

  test("it shows the correct height on load", async function (assert) {
    this.set("value", "foo\nbar\nbaz");

    await render(hbs`
      {{! @glint-nocheck: not typesafe yet }}
      <textarea
        {{auto-height-textarea}}
        value={{this.value}}
       style="line-height: 16px" />
    `);

    const textarea = find("textarea");
    emberAssert("textarea must exist", textarea);

    assert.equal(
      textarea.clientHeight,
      16 * 3,
      "textarea is 3 times the line height"
    );
  });
});
