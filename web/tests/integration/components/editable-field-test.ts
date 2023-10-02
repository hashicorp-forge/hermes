import { click, fillIn, render, triggerKeyEvent } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { MirageTestContext } from "ember-cli-mirage/test-support";
import { setupRenderingTest } from "ember-qunit";
import { module, test } from "qunit";

const EDITABLE_FIELD_SELECTOR = ".editable-field";
const FIELD_TOGGLE_SELECTOR = ".editable-field .field-toggle";
const LOADING_SPINNER_SELECTOR = `${EDITABLE_FIELD_SELECTOR} [data-test-spinner]`;
const ERROR_SELECTOR = "[data-test-empty-value-error]";

interface EditableFieldComponentTestContext extends MirageTestContext {
  onChange: (value: any) => void;
  isLoading: boolean;
  isSaving: boolean;
  value: string;
  newArray: string[];
}

module("Integration | Component | editable-field", function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function (this: EditableFieldComponentTestContext) {
    this.set("onChange", () => {});
  });

  test("it handles splattributes", async function (this: EditableFieldComponentTestContext, assert) {
    await render<EditableFieldComponentTestContext>(hbs`
      <EditableField
        @value="foo"
        @onChange={{this.onChange}}
        class="bar"
      />
    `);

    assert.dom(EDITABLE_FIELD_SELECTOR).hasClass("bar");
  });

  test("it toggles between default and editing modes", async function (this: EditableFieldComponentTestContext, assert) {
    await render<EditableFieldComponentTestContext>(hbs`
      <EditableField
        @value="foo"
        @onChange={{this.onChange}}
      >
        <:default>Foo</:default>
        <:editing>Bar</:editing>
      </EditableField>
    `);

    assert.dom(EDITABLE_FIELD_SELECTOR).exists({ count: 1 }).hasText("Foo");

    await click(FIELD_TOGGLE_SELECTOR);

    assert.dom(EDITABLE_FIELD_SELECTOR).exists({ count: 1 }).hasText("Bar");
  });

  test("it yields the expected value", async function (this: EditableFieldComponentTestContext, assert) {
    await render<EditableFieldComponentTestContext>(hbs`
      <EditableField
        @value="foo"
        @onChange={{this.onChange}}
      >
        <:default as |F|>{{F.value}} one</:default>
        <:editing as |F|>{{F.value}} two</:editing>
      </EditableField>
    `);

    assert.dom(EDITABLE_FIELD_SELECTOR).exists({ count: 1 }).hasText("foo one");

    await click(FIELD_TOGGLE_SELECTOR);

    assert.dom(EDITABLE_FIELD_SELECTOR).exists({ count: 1 }).hasText("foo two");
  });

  test("it can show a saving state", async function (this: EditableFieldComponentTestContext, assert) {
    this.set("isSaving", true);

    await render<EditableFieldComponentTestContext>(hbs`
      <EditableField
        @value="foo"
        @onChange={{this.onChange}}
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

  test("it can show a loading state", async function (this: EditableFieldComponentTestContext, assert) {
    this.set("isLoading", true);

    await render<EditableFieldComponentTestContext>(hbs`
      <EditableField
        @value="foo"
        @onChange={{this.onChange}}
        @isLoading={{this.isLoading}}
      />
    `);

    assert
      .dom(FIELD_TOGGLE_SELECTOR)
      .doesNotExist("content is not yielded while loading");
    assert.dom(LOADING_SPINNER_SELECTOR).exists();

    this.set("isLoading", false);

    assert.dom(LOADING_SPINNER_SELECTOR).doesNotExist();
    assert.dom(FIELD_TOGGLE_SELECTOR).exists();
  });

  test("it yields an emptyValueErrorIsShown property to the editing block", async function (this: EditableFieldComponentTestContext, assert) {
    this.set("onChange", (newValue: string) => {
      this.set("value", newValue);
    });

    this.set("value", "foo");

    await render<EditableFieldComponentTestContext>(hbs`
      <EditableField
        @value={{this.value}}
        @onChange={{this.onChange}}
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

  test("the edit button can be disabled", async function (this: EditableFieldComponentTestContext, assert) {
    await render<EditableFieldComponentTestContext>(hbs`
      <EditableField
        @value="foo"
        @onChange={{this.onChange}}
        @disabled={{true}}
      />
    `);

    assert.dom(FIELD_TOGGLE_SELECTOR).isDisabled();
  });

  test("it cancels when the escape key is pressed", async function (this: EditableFieldComponentTestContext, assert) {
    const defaultText = "foo";

    this.set("value", defaultText);

    await render<EditableFieldComponentTestContext>(hbs`
      <EditableField
        @value={{this.value}}
        @onChange={{this.onChange}}
      />
    `);

    await click(FIELD_TOGGLE_SELECTOR);

    await fillIn("textarea", "Baz");
    await triggerKeyEvent("textarea", "keydown", "Escape");

    assert
      .dom(EDITABLE_FIELD_SELECTOR)
      .hasText(defaultText, "value reverts when escape is pressed");
  });

  test("it runs the passed-in onChange action on blur", async function (this: EditableFieldComponentTestContext, assert) {
    this.set("value", "foo");

    this.set("onChange", (e: unknown) => {
      this.set("value", e);
    });

    await render<EditableFieldComponentTestContext>(hbs`
      <EditableField
        @value={{this.value}}
        @onChange={{this.onChange}}
      />
    `);

    await click(FIELD_TOGGLE_SELECTOR);

    await fillIn("textarea", "bar");

    // Keying "Enter" tests both `onBlur` and `handleKeydown`
    // since `handleKeydown` ultimately calls `onBlur`.
    await triggerKeyEvent("textarea", "keydown", "Enter");

    assert.dom(EDITABLE_FIELD_SELECTOR).hasText("bar");
  });

  test("it yields an `update` (string) function to the editing block", async function (this: EditableFieldComponentTestContext, assert) {
    this.set("value", "foo");
    this.set("onChange", (newValue: string) => {
      this.set("value", newValue);
    });

    await render<EditableFieldComponentTestContext>(hbs`
      <EditableField
        @value={{this.value}}
        @onChange={{this.onChange}}
      >
        <:editing as |F|>
          <Action {{on "click" (fn F.update "bar")}}>
            F.update
          </Action>
        </:editing>
      </EditableField>
    `);

    assert.dom(EDITABLE_FIELD_SELECTOR).hasText("foo");
    await click(FIELD_TOGGLE_SELECTOR);

    await click("button");

    assert.dom(EDITABLE_FIELD_SELECTOR).hasText("bar");
  });

  test("it yields an `update` (array) function to the editing block", async function (this: EditableFieldComponentTestContext, assert) {
    this.set("value", ["foo"]);
    this.set("onChange", (newValue: string[]) => {
      this.set("value", newValue);
    });

    await render<EditableFieldComponentTestContext>(hbs`
      <EditableField
        @value={{this.value}}
        @onChange={{this.onChange}}
      >
        <:editing as |F|>
          <Action {{on "click" (fn F.update (array "bar"))}}>
            F.update
          </Action>
        </:editing>
      </EditableField>
    `);

    assert.dom(EDITABLE_FIELD_SELECTOR).hasText("foo");

    await click(FIELD_TOGGLE_SELECTOR);
    await click("button");

    assert.dom(EDITABLE_FIELD_SELECTOR).hasText("bar");
  });

  test("onChange only runs if the textInput value has changed", async function (this: EditableFieldComponentTestContext, assert) {
    let count = 0;
    this.set("onChange", () => count++);

    await render<EditableFieldComponentTestContext>(hbs`
      <EditableField
        @value="foo"
        @onChange={{this.onChange}}
      />
    `);

    await click(FIELD_TOGGLE_SELECTOR);

    await fillIn("textarea", "foo");
    await triggerKeyEvent(document, "keydown", "Enter");

    assert.equal(count, 0, "onChange has not been called");

    await click(FIELD_TOGGLE_SELECTOR);

    await fillIn("textarea", "bar");
    await triggerKeyEvent(document, "keydown", "Enter");

    assert.equal(count, 1, "onChange has been called");
  });

  test("onChange only runs if the array value has changed", async function (this: EditableFieldComponentTestContext, assert) {
    let count = 0;

    this.set("onChange", () => count++);
    this.set("newArray", ["foo"]);

    await render<EditableFieldComponentTestContext>(hbs`
      <EditableField
        @value={{array "foo"}}
        @onChange={{this.onChange}}
      >
        <:editing as |F|>
          <div {{click-outside (fn F.update this.newArray)}} />
        </:editing>
      </EditableField>
      <div class="click-away"/>
    `);

    await click(FIELD_TOGGLE_SELECTOR);
    await click(".click-away");

    assert.equal(count, 0, "onChange has not been called");

    this.set("newArray", ["bar"]);

    await click(FIELD_TOGGLE_SELECTOR);
    await click(".click-away");

    assert.equal(count, 1, "onChange has been called");
  });

  test("the input value resets on cancel", async function (this: EditableFieldComponentTestContext, assert) {
    await render<EditableFieldComponentTestContext>(hbs`
      <EditableField  @value="foo" @onChange={{this.onChange}} />
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
      <EditableField @value="bar" @onChange={{this.onChange}} />
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
});
