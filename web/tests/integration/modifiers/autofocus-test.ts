import { TestContext, find, render } from "@ember/test-helpers";
import { module, test } from "qunit";
import { hbs } from "ember-cli-htmlbars";
import { setupRenderingTest } from "ember-qunit";

interface AutofocusModifierTestContext extends TestContext {
  buttonIsShown: boolean;
}
module("Integration | Modifier | autofocus", function (hooks) {
  setupRenderingTest(hooks);

  test("it autofocuses a focusable element", async function (this: AutofocusModifierTestContext, assert) {
    this.set("buttonIsShown", false);

    await render<AutofocusModifierTestContext>(hbs`
      <input {{autofocus}} />

      {{#if this.buttonIsShown}}
        <button {{autofocus}}>Button</button>
      {{/if}}
    `);

    assert.true(find("input") === document.activeElement);

    this.set("buttonIsShown", true);

    assert.true(find("button") === document.activeElement);
  });

  test("it can target focusable children of an element", async function (this: AutofocusModifierTestContext, assert) {
    await render<AutofocusModifierTestContext>(hbs`
      <div {{autofocus targetChildren=true}}>
        <span/>
        <input />
        <button />
      </div>
    `);

    assert.true(
      find("input") === document.activeElement,
      "the first focusable child is focused"
    );
  });
});
