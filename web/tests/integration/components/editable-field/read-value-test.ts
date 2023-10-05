import { TestContext, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { setupRenderingTest } from "ember-qunit";
import { HermesUser } from "hermes/types/document";
import { module, test } from "qunit";

interface EditableFieldReadValueComponentTestContext extends TestContext {
  tag?: "h1";
  value?: string | HermesUser[];
  placeholder?: string;
}

module("Integration | Component | editable-field/read-value", function (hooks) {
  setupRenderingTest(hooks);

  test("it renders the correct tag", async function (this: EditableFieldReadValueComponentTestContext, assert) {
    this.set("tag", "h1");

    await render<EditableFieldReadValueComponentTestContext>(hbs`
      <EditableField::ReadValue
        @tag={{this.tag}}
        @value="Hello World"
      />
    `);

    assert.dom("h1").hasText("Hello World");

    this.set("tag", undefined);

    assert.dom("h1").doesNotExist();
    assert.dom("p").hasText("Hello World");
  });

  test("it shows a customizable empty state", async function (this: EditableFieldReadValueComponentTestContext, assert) {
    this.set("value", "");
    this.set("placeholder", undefined);

    await render<EditableFieldReadValueComponentTestContext>(hbs`
      <EditableField::ReadValue
        @value={{this.value}}
        @placeholder={{this.placeholder}}
      />
    `);

    // Test empty string value
    assert.dom(".empty-state-text").hasText("None");

    // Test that a string value removes the empty state
    this.set("value", "foo");
    assert.dom(".empty-state-text").doesNotExist();

    // Test empty array value
    this.set("value", []);
    assert.dom(".empty-state-text").hasText("None");

    // Test that a non-empty array value removes the empty state
    this.set("value", [{ email: "foo" }]);
    assert.dom(".empty-state-text").doesNotExist();

    // Reset to empty and test the placeholder argument
    this.set("value", []);
    this.set("placeholder", "No value");
    assert.dom(".empty-state-text").hasText("No value");
  });

  test('it renders correctly based on the "value" argument', async function (this: EditableFieldReadValueComponentTestContext, assert) {
    this.set("value", "foo");

    await render<EditableFieldReadValueComponentTestContext>(hbs`
      <EditableField::ReadValue
        @value="{{this.value}}"
      />
    `);

    assert.dom("[data-test-string-value]").hasText("foo");

    this.set("value", [{ email: "foo" }]);

    assert.dom("[data-test-person-list]").exists();
  });
});
