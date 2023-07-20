import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { TestContext, render, triggerEvent } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";

interface TooltipIconComponentTestContext extends TestContext {
  icon?: string;
}

const TRIGGER_SELECTOR = "[data-test-tooltip-icon-trigger]";
const TOOLTIP_SELECTOR = ".hermes-tooltip";

module("Integration | Component | tooltip-icon", function (hooks) {
  setupRenderingTest(hooks);

  test("it renders correctly", async function (this: TooltipIconComponentTestContext, assert) {
    this.set("icon", undefined);

    await render<TooltipIconComponentTestContext>(hbs`
      <TooltipIcon
        @text="This is a tooltip"
        @icon={{this.icon}}
        class="foo"
      />
    `);

    assert
      .dom(TRIGGER_SELECTOR)
      .hasAttribute("data-test-icon", "help", "default icon shown")
      .hasClass("foo", "splattributes handled");

    assert.dom(TOOLTIP_SELECTOR).doesNotExist();

    this.set("icon", "smile");

    assert
      .dom(TRIGGER_SELECTOR)
      .hasAttribute(
        "data-test-icon",
        "smile",
        "default icon can be overridden"
      );

    await triggerEvent(TRIGGER_SELECTOR, "mouseenter");

    assert
      .dom(TOOLTIP_SELECTOR)
      .hasText("This is a tooltip", "tooltip text shown");
  });
});
