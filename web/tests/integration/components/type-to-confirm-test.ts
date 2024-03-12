import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import {
  TestContext,
  fillIn,
  render,
  triggerKeyEvent,
} from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import htmlElement from "hermes/utils/html-element";

const VALUE = "fried food";
const LABEL = "[data-test-type-to-confirm-label]";
const INPUT = "[data-test-type-to-confirm-input]";

interface Context extends TestContext {
  value: string;
  onEnter: () => void;
}

module("Integration | Component | type-to-confirm", function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function (this: Context) {
    this.value = VALUE;
  });

  test("it yields an input component", async function (this: Context, assert) {
    await render<Context>(hbs`
      <TypeToConfirm @value={{this.value}} as |T|>
        <T.Input />
      </TypeToConfirm>
    `);

    assert.dom(LABEL).hasText(`Type ${VALUE} to confirm`);
    assert.dom(INPUT).exists();
  });

  test("it yields a `hasConfirmed` value", async function (this: Context, assert) {
    await render<Context>(hbs`
      <TypeToConfirm @value={{this.value}} as |T|>
        <div data-test-has-confirmed>
          {{#if T.hasConfirmed}}
            true
          {{else}}
            false
          {{/if}}
        </div>
        <T.Input />
      </TypeToConfirm>
    `);

    const selector = "[data-test-has-confirmed]";

    assert.dom(selector).hasText("false");

    await fillIn(INPUT, VALUE);

    assert.dom(selector).hasText("true");
  });

  test("it generates an id", async function (this: Context, assert) {
    await render<Context>(hbs`
      <TypeToConfirm @value={{this.value}} as |T|>
        <T.Input />
      </TypeToConfirm>
    `);

    const labelFor = htmlElement(LABEL).getAttribute("for");
    const inputId = htmlElement(INPUT).getAttribute("id");

    assert.equal(labelFor, inputId);
  });

  test("in the `hasConfirmed` state, keying Enter runs the passed-in `onEnter` action ", async function (this: Context, assert) {
    let count = 0;

    this.set("onEnter", () => {
      count++;
    });

    await render<Context>(hbs`
      <TypeToConfirm @value={{this.value}} @onEnter={{this.onEnter}} as |T|>
        <T.Input />
      </TypeToConfirm>
    `);

    await triggerKeyEvent(INPUT, "keydown", "Enter");

    assert.equal(count, 0);

    await fillIn(INPUT, VALUE);
    await triggerKeyEvent(INPUT, "keydown", "Enter");

    assert.equal(count, 1);
  });
});
