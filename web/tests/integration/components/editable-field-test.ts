import { click, fillIn, render, triggerKeyEvent } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { MirageTestContext } from "ember-cli-mirage/test-support";
import { setupRenderingTest } from "ember-qunit";
import { module, test } from "qunit";

const EDITABLE_FIELD_SELECTOR = ".editable-field";
const FIELD_TOGGLE_SELECTOR = ".editable-field .field-toggle";
const LOADING_SPINNER_SELECTOR = `${EDITABLE_FIELD_SELECTOR} [data-test-spinner]`;
const ERROR_SELECTOR = "[data-test-empty-value-error]";

const STRING_VALUE_SELECTOR = "[data-test-string-value]";
const PEOPLE_SELECT_SELECTOR = "[data-test-people-select]";

interface EditableFieldComponentTestContext extends MirageTestContext {
  onCommit: (value: any) => void;
  isLoading: boolean;
  isSaving: boolean;
  value: string;
  newArray: string[];
}

module("Integration | Component | editable-field", function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function (this: EditableFieldComponentTestContext) {
    this.set("onCommit", () => {});
  });

  test("it handles splattributes", async function (this: EditableFieldComponentTestContext, assert) {
    await render<EditableFieldComponentTestContext>(hbs`
      <EditableField
        @value="foo"
        @onSave={{this.onCommit}}
        class="bar"
      />
    `);

    assert.dom(EDITABLE_FIELD_SELECTOR).hasClass("bar");
  });

  test("it toggles between default and editing modes (text field)", async function (this: EditableFieldComponentTestContext, assert) {
    await render<EditableFieldComponentTestContext>(hbs`
      <EditableField
        @value="foo"
        @onSave={{this.onCommit}}
      />
    `);

    assert.dom(EDITABLE_FIELD_SELECTOR).exists({ count: 1 }).hasText("Foo");

    await click(FIELD_TOGGLE_SELECTOR);

    assert.dom(EDITABLE_FIELD_SELECTOR).exists({ count: 1 }).hasText("Bar");
  });

  test("it can show a saving state", async function (this: EditableFieldComponentTestContext, assert) {
    this.set("isSaving", true);

    await render<EditableFieldComponentTestContext>(hbs`
      <EditableField
        @value="foo"
        @onSave={{this.onCommit}}
        @isSaving={{this.isSaving}}
      />
    `);

    assert.dom(FIELD_TOGGLE_SELECTOR).hasClass("saving").isDisabled();
    assert.dom(LOADING_SPINNER_SELECTOR).exists();

    this.set("isSaving", false);

    assert
      .dom(FIELD_TOGGLE_SELECTOR)
      .doesNotHaveClass("saving")
      .isNotDisabled();

    assert.dom(LOADING_SPINNER_SELECTOR).doesNotExist();
  });

  test("it shows an error when a required field is left empty", async function (this: EditableFieldComponentTestContext, assert) {
    this.set("onCommit", (newValue: string) => {
      this.set("value", newValue);
    });

    this.set("value", "foo");

    await render<EditableFieldComponentTestContext>(hbs`
      <EditableField
        @value={{this.value}}
        @onSave={{this.onCommit}}
        @isRequired={{true}}
      />
    `);

    assert.dom(ERROR_SELECTOR).doesNotExist();

    await click(FIELD_TOGGLE_SELECTOR);

    assert.dom(ERROR_SELECTOR).doesNotExist();

    await fillIn("textarea", "");
    await triggerKeyEvent(document, "keydown", "Enter");

    assert.dom(ERROR_SELECTOR).exists();
  });

  test("it conditionally determines whether to wrap the read-only value in a button", async function (this: EditableFieldComponentTestContext, assert) {
    this.set("disabled", false);

    await render<EditableFieldComponentTestContext>(hbs`
      <EditableField
        @value="foo"
        @onSave={{this.onCommit}}
        @disabled={{true}}
      />
    `);

    assert
      .dom("button.field-toggle")
      .exists('when enabled, the "read" value is a toggle');

    this.set("disabled", true);

    assert
      .dom("button.field-toggle")
      .doesNotExist(
        "the field toggle is not rendered as a button when editing disabled",
      );

    assert
      .dom("div.field-toggle")
      .exists("the element is rendered as a div when editing is disabled");
  });

  test("it cancels when the escape key is pressed", async function (this: EditableFieldComponentTestContext, assert) {
    const defaultText = "foo";

    this.set("value", defaultText);

    await render<EditableFieldComponentTestContext>(hbs`
      <EditableField
        @value={{this.value}}
        @onSave={{this.onCommit}}
      />
    `);

    await click(FIELD_TOGGLE_SELECTOR);

    await fillIn("textarea", "Baz");
    await triggerKeyEvent("textarea", "keydown", "Escape");

    assert
      .dom(EDITABLE_FIELD_SELECTOR)
      .hasText(defaultText, "value reverts when escape is pressed");
  });

  test("it runs the passed-in onCommit action", async function (this: EditableFieldComponentTestContext, assert) {
    this.set("value", "foo");

    this.set("onCommit", (e: unknown) => {
      this.set("value", e);
    });

    await render<EditableFieldComponentTestContext>(hbs`
      <EditableField
        @value={{this.value}}
        @onSave={{this.onCommit}}
      />
    `);

    await click(FIELD_TOGGLE_SELECTOR);

    await fillIn("textarea", "bar");
    await triggerKeyEvent("textarea", "keydown", "Enter");

    assert.dom(EDITABLE_FIELD_SELECTOR).hasText("bar");
    assert.dom("textarea").doesNotExist("textarea is removed on save");
  });

  test("onCommit only runs if the textInput value has changed", async function (this: EditableFieldComponentTestContext, assert) {
    let count = 0;
    this.set("onCommit", () => count++);

    await render<EditableFieldComponentTestContext>(hbs`
      <EditableField
        @value="foo"
        @onSave={{this.onCommit}}
      />
    `);

    await click(FIELD_TOGGLE_SELECTOR);

    await fillIn("textarea", "foo");
    await triggerKeyEvent(document, "keydown", "Enter");

    assert.equal(count, 0, "onCommit has not been called");

    await click(FIELD_TOGGLE_SELECTOR);

    await fillIn("textarea", "bar");
    await triggerKeyEvent(document, "keydown", "Enter");

    assert.equal(count, 1, "onCommit has been called");
  });

  test("onCommit only runs if the array value has changed", async function (this: EditableFieldComponentTestContext, assert) {
    let count = 0;

    this.set("onCommit", () => count++);
    this.set("newArray", ["foo"]);

    await render<EditableFieldComponentTestContext>(hbs`
      <EditableField
        @value={{array "foo"}}
        @onSave={{this.onCommit}}
      >
        <:editing as |F|>
          <div {{click-outside (fn F.update this.newArray)}} />
        </:editing>
      </EditableField>
      <div class="click-away"/>
    `);

    await click(FIELD_TOGGLE_SELECTOR);
    await click(".click-away");

    assert.equal(count, 0, "onCommit has not been called");

    this.set("newArray", ["bar"]);

    await click(FIELD_TOGGLE_SELECTOR);
    await click(".click-away");

    assert.equal(count, 1, "onCommit has been called");
  });

  test("the input value resets on cancel", async function (this: EditableFieldComponentTestContext, assert) {
    await render<EditableFieldComponentTestContext>(hbs`
      <EditableField  @value="foo" @onSave={{this.onCommit}} />
    `);

    await click(FIELD_TOGGLE_SELECTOR);

    await fillIn("textarea", "bar");
    await triggerKeyEvent("textarea", "keydown", "Escape");

    assert.dom(EDITABLE_FIELD_SELECTOR).hasText("foo");

    await click(FIELD_TOGGLE_SELECTOR);

    assert.dom("textarea").hasValue("foo");
  });

  test("it trims a string value before evaluating it", async function (this: EditableFieldComponentTestContext, assert) {
    await render<EditableFieldComponentTestContext>(hbs`
      <EditableField @value="bar" @onSave={{this.onCommit}} />
    `);

    assert.dom(EDITABLE_FIELD_SELECTOR).hasText("bar");

    await click(FIELD_TOGGLE_SELECTOR);

    assert.dom("textarea").hasValue("bar");

    await fillIn("textarea", " bar ");

    await triggerKeyEvent("textarea", "keydown", "Enter");

    assert.dom(EDITABLE_FIELD_SELECTOR).hasText("bar");

    await click(FIELD_TOGGLE_SELECTOR);

    assert.dom("textarea").hasValue("bar");
  });

  test("it shows a text input or people input depending on the value", async function (this: EditableFieldComponentTestContext, assert) {
    await render<EditableFieldComponentTestContext>(hbs`
      <EditableField
        data-test-one
        @value="foo"
        @onSave={{this.onCommit}}
      />

      <EditableField
        data-test-two
        @value={{array (hash email="bar")}}
        @onSave={{this.onCommit}}
      />
    `);

    assert
      .dom(`[data-test-one] ${STRING_VALUE_SELECTOR}`)
      .exists("string value handled correctly");

    assert
      .dom(`[data-test-two] [data-test-person-list]`)
      .exists("array value handled correctly");

    await click(`[data-test-one] ${FIELD_TOGGLE_SELECTOR}`);

    assert
      .dom(`[data-test-one] textarea`)
      .exists('strings become a "textarea"');

    await click(`[data-test-two] ${FIELD_TOGGLE_SELECTOR}`);

    assert
      .dom(`[data-test-two] ${PEOPLE_SELECT_SELECTOR}`)
      .exists('arrays become a "PeopleSelect"');
  });

  test("it autofocuses the inputs when the editing functions are enabled", async function (this: EditableFieldComponentTestContext, assert) {
    await render<EditableFieldComponentTestContext>(hbs`
      <EditableField
        data-test-one
        @value="foo"
        @onSave={{this.onCommit}}
      />

      <EditableField
        data-test-two
        @value={{array (hash email="bar")}}
        @onSave={{this.onCommit}}
      />
    `);
  });

  test("edit affordances are shown on hover", async function (this: EditableFieldComponentTestContext, assert) {});

  test("it shows confirm and cancel buttons when in editing mode", async function (this: EditableFieldComponentTestContext, assert) {});

  test("the confirm and cancel buttons work as expected", async function (this: EditableFieldComponentTestContext, assert) {});
});
