import { click, fillIn, render, triggerKeyEvent } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { MirageTestContext } from "ember-cli-mirage/test-support";
import { setupRenderingTest } from "ember-qunit";
import { module, test } from "qunit";

const EDITABLE_FIELD = ".editable-field";
const FIELD_TOGGLE = ".field-toggle";
const SAVING_SPINNER = `${EDITABLE_FIELD} [data-test-saving-spinner]`;
const ERROR = "[data-test-empty-value-error]";

const STRING_VALUE = "[data-test-string-value]";
const PEOPLE_SELECT = "[data-test-people-select]";

const SAVE_BUTTON = "[data-test-save-button";
const CANCEL_BUTTON = "[data-test-cancel-button]";

const REMOVE_USER_BUTTON = ".ember-power-select-multiple-remove-btn";
const EDITABLE_PERSON = ".ember-power-select-multiple-option";

interface EditableFieldComponentTestContext extends MirageTestContext {
  onCommit: (value: any) => void;
  isLoading: boolean;
  isSaving: boolean;
  value: string;
  newArray: string[];
  disabled: boolean;
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

    assert.dom(EDITABLE_FIELD).hasClass("bar");
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

    assert.dom(EDITABLE_FIELD).hasClass("saving");
    assert.dom(SAVING_SPINNER).exists();

    this.set("isSaving", false);

    assert.dom(EDITABLE_FIELD).doesNotHaveClass("saving");
    assert.dom(SAVING_SPINNER).doesNotExist();
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

    assert.dom(ERROR).doesNotExist();

    await click(FIELD_TOGGLE);

    assert.dom(ERROR).doesNotExist();

    await fillIn("textarea", "");
    await click(SAVE_BUTTON);

    assert.dom(ERROR).exists();

    // Cancel and try again

    await click(CANCEL_BUTTON);

    assert.dom(ERROR).doesNotExist();

    await click(FIELD_TOGGLE);

    assert.dom(ERROR).doesNotExist("the error state resets on cancel");

    // Cause another error

    await fillIn("textarea", "");
    await click(SAVE_BUTTON);

    assert.dom(ERROR).exists();

    // Save a valid value

    await fillIn("textarea", "bar");
    await click(SAVE_BUTTON);

    assert.dom(ERROR).doesNotExist();

    // Reenable edit mode

    await click(FIELD_TOGGLE);

    assert.dom(ERROR).doesNotExist("the error state resets on save");
  });

  test("it conditionally determines whether to wrap the read-only value in a button", async function (this: EditableFieldComponentTestContext, assert) {
    this.set("disabled", false);

    await render<EditableFieldComponentTestContext>(hbs`
      <EditableField
        @value="foo"
        @onSave={{this.onCommit}}
        @isReadOnly={{this.disabled}}
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
      .dom("div.field-toggle.read-only")
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

    await click(FIELD_TOGGLE);

    await fillIn("textarea", "Baz");
    await triggerKeyEvent("textarea", "keydown", "Escape");

    assert
      .dom(EDITABLE_FIELD)
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

    await click(FIELD_TOGGLE);

    await fillIn("textarea", "bar");
    await triggerKeyEvent("textarea", "keydown", "Enter");

    assert.dom(EDITABLE_FIELD).hasText("bar");
    assert.dom("textarea").doesNotExist("textarea is removed on save");
  });

  test("onCommit only runs if the value has changed (STRING)", async function (this: EditableFieldComponentTestContext, assert) {
    let count = 0;

    this.set("onCommit", () => count++);

    await render<EditableFieldComponentTestContext>(hbs`
      <EditableField
        @value="foo"
        @onSave={{this.onCommit}}
      />
    `);

    await click(FIELD_TOGGLE);

    await fillIn("textarea", "foo");
    await click(SAVE_BUTTON);

    assert.equal(count, 0, "onCommit has not been called");

    await click(FIELD_TOGGLE);

    await fillIn("textarea", "bar");
    await click(SAVE_BUTTON);

    assert.equal(count, 1, "onCommit has been called");
  });

  test("onCommit only runs if the value has changed (PEOPLE)", async function (this: EditableFieldComponentTestContext, assert) {
    let count = 0;

    this.set("value", [{ email: "foo" }]);

    this.set("onCommit", () => {
      count++;
    });

    await render<EditableFieldComponentTestContext>(hbs`
      <EditableField
        @value={{array (hash email="foo")}}
        @onSave={{this.onCommit}}
      />
    `);

    // Make no change
    await click(FIELD_TOGGLE);
    await click(SAVE_BUTTON);

    assert.equal(count, 0, "onCommit has not been called");

    // Make a change
    await click(FIELD_TOGGLE);
    await click(REMOVE_USER_BUTTON);
    await click(SAVE_BUTTON);

    assert.equal(count, 1, "onCommit has been called");
  });

  test("the value resets on cancel (STRING)", async function (this: EditableFieldComponentTestContext, assert) {
    await render<EditableFieldComponentTestContext>(hbs`
      <EditableField  @value="foo" @onSave={{this.onCommit}} />
    `);

    assert.dom(EDITABLE_FIELD).hasText("foo");

    // Cancel using Escape key

    await click(FIELD_TOGGLE);
    await fillIn("textarea", "bar");
    await triggerKeyEvent("textarea", "keydown", "Escape");

    assert.dom(EDITABLE_FIELD).hasText("foo");

    await click(FIELD_TOGGLE);

    assert.dom("textarea").hasValue("foo");

    // Cancel using the button

    await fillIn("textarea", "bar");
    await click(CANCEL_BUTTON);

    assert.dom(EDITABLE_FIELD).hasText("foo");

    await click(FIELD_TOGGLE);

    assert.dom("textarea").hasValue("foo");
  });

  test("the value resets on cancel (PEOPLE)", async function (this: EditableFieldComponentTestContext, assert) {
    await render<EditableFieldComponentTestContext>(hbs`
      <EditableField
        @value={{array (hash email="foo")}}
        @onSave={{this.onCommit}}
      />
    `);

    assert.dom(EDITABLE_FIELD).containsText("foo");

    // Cancel using Escape key

    await click(FIELD_TOGGLE);
    await click(REMOVE_USER_BUTTON);
    await triggerKeyEvent("input", "keydown", "Escape");

    assert.dom(EDITABLE_FIELD).containsText("foo");

    await click(FIELD_TOGGLE);

    assert.dom(EDITABLE_PERSON).containsText("foo");

    // Cancel using the button

    await click(REMOVE_USER_BUTTON);
    await click(CANCEL_BUTTON);

    assert.dom(EDITABLE_FIELD).containsText("foo");

    await click(FIELD_TOGGLE);

    assert.dom(EDITABLE_PERSON).containsText("foo");
  });

  test("it trims a string value before evaluating it", async function (this: EditableFieldComponentTestContext, assert) {
    await render<EditableFieldComponentTestContext>(hbs`
      <EditableField @value="bar" @onSave={{this.onCommit}} />
    `);

    assert.dom(EDITABLE_FIELD).hasText("bar");

    await click(FIELD_TOGGLE);

    assert.dom("textarea").hasValue("bar");

    await fillIn("textarea", " bar ");

    await triggerKeyEvent("textarea", "keydown", "Enter");

    assert.dom(EDITABLE_FIELD).hasText("bar");

    await click(FIELD_TOGGLE);

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
      .dom(`[data-test-one] ${STRING_VALUE}`)
      .exists("string value handled correctly");

    assert
      .dom(`[data-test-two] [data-test-person-list]`)
      .exists("array value handled correctly");

    await click(`[data-test-one] ${FIELD_TOGGLE}`);

    assert
      .dom(`[data-test-one] textarea`)
      .exists('strings become a "textarea"');

    await click(`[data-test-two] ${FIELD_TOGGLE}`);

    assert
      .dom(`[data-test-two] ${PEOPLE_SELECT}`)
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

    await click(`[data-test-one] ${FIELD_TOGGLE}`);
    assert.dom(`[data-test-one] textarea`).isFocused();

    await click(`[data-test-two] ${FIELD_TOGGLE}`);
    assert.dom(`[data-test-two] ${PEOPLE_SELECT} input`).isFocused();
  });

  test("it shows confirm and cancel buttons when in editing mode", async function (this: EditableFieldComponentTestContext, assert) {
    await render<EditableFieldComponentTestContext>(hbs`
      <EditableField
        @value="foo"
        @onSave={{this.onCommit}}
      />
    `);

    assert.dom(SAVE_BUTTON).doesNotExist();
    assert.dom(CANCEL_BUTTON).doesNotExist();

    await click(FIELD_TOGGLE);

    assert.dom(SAVE_BUTTON).exists();
    assert.dom(CANCEL_BUTTON).exists();
  });

  test("the confirm and cancel buttons work as expected", async function (this: EditableFieldComponentTestContext, assert) {
    await render<EditableFieldComponentTestContext>(hbs`
      <EditableField
        @value="foo"
        @onSave={{this.onCommit}}
      />
    `);

    await click(FIELD_TOGGLE);
    await fillIn("textarea", "bar");
    await click(SAVE_BUTTON);

    assert.dom(EDITABLE_FIELD).hasText("bar");

    await click(FIELD_TOGGLE);

    assert.dom("textarea").hasValue("bar");

    await fillIn("textarea", "baz");
    await click(CANCEL_BUTTON);

    assert.dom(EDITABLE_FIELD).hasText("bar");

    await click(FIELD_TOGGLE);

    assert.dom("textarea").hasValue("bar");
  });
});
