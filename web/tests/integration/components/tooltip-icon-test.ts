import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { TestContext, render, triggerEvent } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { TOOLTIP_ICON_TRIGGER, TOOLTIP } from "hermes/tests/helpers/selectors";

interface TooltipIconComponentTestContext extends TestContext {
  icon?: string;
}

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
      .dom(TOOLTIP_ICON_TRIGGER)
      .hasAttribute("data-test-icon", "help", "default icon shown")
      .hasClass("foo", "splattributes handled");

    assert.dom(TOOLTIP).doesNotExist();

    this.set("icon", "smile");

    assert
      .dom(TOOLTIP_ICON_TRIGGER)
      .hasAttribute(
        "data-test-icon",
        "smile",
        "default icon can be overridden"
      );

    await triggerEvent(TOOLTIP_ICON_TRIGGER, "mouseenter");

    assert
      .dom(TOOLTIP)
      .hasText("This is a tooltip", "tooltip text shown");
  });
});
