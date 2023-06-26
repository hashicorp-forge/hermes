import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { TestContext, click, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";

interface HdsTabTestContext extends TestContext {
  action: () => void;
  isSelected: boolean;
  buttonWasClicked: boolean;
}

module("Integration | Component | hds-tab", function (hooks) {
  setupRenderingTest(hooks);

  test("it renders as expected", async function (this: HdsTabTestContext, assert) {
    this.set("action", () => {
      this.set("buttonWasClicked", true);
    });
    this.set("isSelected", false);

    await render<HdsTabTestContext>(hbs`
      <X::HdsTab
        @label="Tab"
        @icon="star"
        @action={{this.action}}
        @isSelected={{this.isSelected}}

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

    // test the is-selected state
    assert.dom(".x-hds-tab--selected").doesNotExist();
    this.set("isSelected", true);
    assert.dom(".x-hds-tab--selected").exists("Tab has a selected state");
  });
});
