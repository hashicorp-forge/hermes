import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { click, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";

module("Integration | Component | action", function (hooks) {
  setupRenderingTest(hooks);

  test("it renders a block", async function (assert) {
    await render(hbs`
      <Action>
        <div class="test">
          HashiCorp
        </div>
      </Action>
    `);

    assert.dom(".action .test").hasText("HashiCorp");
  });

  test("it takes parameters", async function (assert) {
    this.set("disabled", false);
    this.set("contentIsShown", false);
    this.set("toggleContent", () => {
      this.set("contentIsShown", !this.contentIsShown);
    });

    await render(hbs`
      <Action class="test-button" {{on "click" this.toggleContent}} disabled={{this.disabled}}>
        Toggle
      </Action>

      {{#if this.contentIsShown}}
        <div class="content"/>
      {{/if}}

    `);

    assert.dom(".test-button").hasText("Toggle");
    assert.dom(".content").doesNotExist();
    await click(".test-button");
    assert.dom(".content").exists();

    assert.dom(".test-button").doesNotHaveAttribute("disabled");
    this.set("disabled", true);
    assert.dom(".test-button").hasAttribute("disabled");
  });
});
