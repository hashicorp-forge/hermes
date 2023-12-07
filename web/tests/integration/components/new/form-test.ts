import { render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { setupRenderingTest } from "ember-qunit";
import { module, test } from "qunit";

const DEFAULT_FORM = "[data-test-new-form]";
const FORM_FOR_MODAL = "[data-test-new-form-for-modal]";

const ICON = "[data-test-feature-icon]";
const HEADLINE = "[data-test-form-headline]";
const SUBMIT_BUTTON = "[data-test-submit]";

module("Integration | Component | new/form", function (hooks) {
  setupRenderingTest(hooks);

  test("it's formatted by default with additional elements", async function (assert) {
    await render(hbs`
      <New::Form
        @taskIsRunning={{false}}
        @buttonText="Create"
        @buttonIsActive={{true}}
      />
    `);

    assert.dom(DEFAULT_FORM).exists();
    assert.dom(ICON).exists();
    assert.dom(HEADLINE).exists();
    assert.dom(SUBMIT_BUTTON).exists();

    assert.dom(FORM_FOR_MODAL).doesNotExist();
  });

  test("it can be formatted for a modal without additional elements", async function (assert) {
    await render(hbs`
      <New::Form
        @taskIsRunning={{false}}
        @buttonText="Create"
        @buttonIsActive={{true}}
        @isModal={{true}}
      />
    `);

    assert.dom(DEFAULT_FORM).doesNotExist();
    assert.dom(ICON).doesNotExist();
    assert.dom(HEADLINE).doesNotExist();
    assert.dom(SUBMIT_BUTTON).doesNotExist();

    assert.dom(FORM_FOR_MODAL).exists();
  });
});
