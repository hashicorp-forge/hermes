import {
  click,
  fillIn,
  render,
  triggerEvent,
  triggerKeyEvent,
  waitUntil,
} from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { MirageTestContext } from "ember-cli-mirage/test-support";
import { setupRenderingTest } from "ember-qunit";
import { module, test } from "qunit";

const EDITABLE_FIELD_SELECTOR = ".editable-field";
const FIELD_TOGGLE_SELECTOR = ".editable-field .field-toggle";
const LOADING_SPINNER_SELECTOR = ".loading-indicator";

interface EditableFieldComponentTestContext extends MirageTestContext {
  onChange: (value: any) => void;
  isLoading: boolean;
  value: string;
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

  test("it can show a loading state", async function (this: EditableFieldComponentTestContext, assert) {
    this.set("isLoading", true);

    await render<EditableFieldComponentTestContext>(hbs`
      <EditableField
        @value="foo"
        @onChange={{this.onChange}}
        @loading={{this.isLoading}}
      />
    `);

    assert.dom(FIELD_TOGGLE_SELECTOR).hasClass("loading").isDisabled();

    assert.dom(LOADING_SPINNER_SELECTOR).exists();

    this.set("isLoading", false);

    assert
      .dom(FIELD_TOGGLE_SELECTOR)
      .doesNotHaveClass("loading")
      .isNotDisabled();

    assert.dom(LOADING_SPINNER_SELECTOR).doesNotExist();
  });

  test("it yields an emptyValueErrorIsShown property to the editing block", async function (this: EditableFieldComponentTestContext, assert) {
    await render<EditableFieldComponentTestContext>(hbs`
      <EditableField
        @value="foo"
        @onChange={{this.onChange}}
        @isRequired={{true}}
      >
        <:default>Foo</:default>
        <:editing as |F|>
          <input type="text" value={{F.value}} {{F.input}} />

          {{#if F.emptyValueErrorIsShown}}
            <div class="error">Empty value error</div>
          {{/if}}
        </:editing>
      </EditableField>
    `);

    assert.dom(".error").doesNotExist();

    await click(FIELD_TOGGLE_SELECTOR);

    assert.dom(".error").doesNotExist();

    await fillIn("input", "");
    await triggerEvent("input", "blur");

    assert.dom(".error").exists();
  });

  test("the edit button can be disabled", async function (this: EditableFieldComponentTestContext, assert) {
    await render<EditableFieldComponentTestContext>(hbs`
      <EditableField
        @value="foo"
        @onChange={{this.onChange}}
        @disabled={{true}}
      >
        <:default>Foo</:default>
        <:editing>Bar</:editing>
      </EditableField>
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
      >
        <:default as |F|>{{F.value}}</:default>
        <:editing as |F|>
          <input type="text" value={{F.value}} />
        </:editing>
      </EditableField>
    `);

    await click(FIELD_TOGGLE_SELECTOR);

    await fillIn("input", "Baz");

    await triggerEvent("input", "keydown", {
      key: "Escape",
    });

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
      >
        <:default as |F|>{{F.value}}</:default>
        <:editing as |F|>
          <input {{F.input}} type="text" value={{F.value}} />
        </:editing>
      </EditableField>
    `);

    await click(FIELD_TOGGLE_SELECTOR);

    await fillIn("input", "bar");

    // Keying "Enter" tests both `onBlur` and `handleKeydown`
    // since `handleKeydown` ultimately calls `onBlur`.
    await triggerKeyEvent(EDITABLE_FIELD_SELECTOR, "keydown", "Enter");

    await waitUntil(() => this.value === "bar");

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
        <:default as |F|>
          {{F.value}}
        </:default>
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
        <:default as |F|>
          {{F.value}}
        </:default>
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

  test("it only runs the onChange action if the value has changed", async function (this: EditableFieldComponentTestContext, assert) {
    let count = 0;
    this.set("onChange", () => count++);

    await render<EditableFieldComponentTestContext>(hbs`
      <EditableField
        @value="foo"
        @onChange={{this.onChange}}
      >
        <:default as |F|>
          {{F.value}}
        </:default>
        <:editing as |F|>
          <input {{F.input}} type="text" value={{F.value}} />
        </:editing>
      </EditableField>
    `);

    assert.equal(count, 0, "onChange has not been called");

    await click(FIELD_TOGGLE_SELECTOR);

    await fillIn("input", "foo");
    await triggerEvent("input", "blur");

    assert.equal(count, 0, "onChange has not been called");

    await click(FIELD_TOGGLE_SELECTOR);

    await fillIn("input", "bar");
    await triggerKeyEvent("input", "keydown", "Enter");

    assert.equal(count, 1, "onChange has been called");
  });

  test("the input value resets on cancel", async function (this: EditableFieldComponentTestContext, assert) {
    await render<EditableFieldComponentTestContext>(hbs`
      <EditableField  @value="foo" @onChange={{this.onChange}}>
        <:default as |F|>
          {{F.value}}
        </:default>
        <:editing as |F|>
          <input {{F.input}} type="text" value={{F.value}} />
        </:editing>
      </EditableField>
    `);

    await click(FIELD_TOGGLE_SELECTOR);

    await fillIn("input", "bar");
    await triggerKeyEvent("input", "keydown", "Escape");

    assert.dom(EDITABLE_FIELD_SELECTOR).hasText("foo");

    await click(FIELD_TOGGLE_SELECTOR);

    assert.dom("input").hasValue("foo");
  });
});
