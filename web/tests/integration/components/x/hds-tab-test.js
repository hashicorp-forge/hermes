import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { click, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";

module("Integration | Component | hds-tab", function (hooks) {
  setupRenderingTest(hooks);

  test("it renders as a link", async function (assert) {
    await render(hbs`
    <X::HdsTab
        @label="Tab"
        @icon="star"
        @link="/"
      />
    `);

    assert.dom(".x-hds-tab--link").hasText("Tab");
    assert.dom(".flight-icon-star").exists();
  });

  test("it can be displayed `iconOnly`", async function (assert) {
    await render(hbs`
    <X::HdsTab
        @label="Tab"
        @icon="star"
        @link="/"
        @iconOnly={{true}}
      />
    `);

    assert.dom(".x-hds-tab span").doesNotExist();
    assert.dom(".flight-icon-star").exists();
  });

  test("it renders as a button when an `action` is provided", async function (assert) {
    this.set("action", () => {
      this.set("buttonWasClicked", true);
    });

    await render(hbs`
      <X::HdsTab
        @label="Tab"
        @icon="star"
        @action={{this.action}}
      />

      {{#if this.buttonWasClicked}}
        <div class="success-message">
          The action worked!
        </div>
      {{/if}}
      `);

    assert.dom(".x-hds-tab--button").hasText("Tab");

    // Test the action
    assert.dom(".success-message").doesNotExist();
    await click(".x-hds-tab--button");
    assert.dom(".success-message").exists();
  });

  test("it can take a selected state", async function (assert) {
    this.set("isSelected", false);

    await render(hbs`
      <X::HdsTab
        @label="Tab"
        @icon="star"
        @link="/"
        @isSelected={{this.isSelected}}
      />
      `);

    assert.dom(".x-hds-tab--selected").doesNotExist();
    this.set("isSelected", true);
    assert.dom(".x-hds-tab--selected").exists("Tab has a selected state");
  });
});
