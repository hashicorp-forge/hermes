import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import {
  TestContext,
  click,
  render,
  triggerEvent,
  waitFor,
} from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import sinon from "sinon";

module("Integration | Component | copy-u-r-l-button", function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    sinon.stub(navigator.clipboard, "writeText").resolves();
    sinon.stub(navigator.clipboard, "readText").resolves("https://hashicorp.com");
  });

  test("it renders as expected", async function (assert) {
    this.set("tooltipPlacement", null);

    // Render with padding so the tooltip has room on all sides:

    await render(hbs`
      {{! @glint-nocheck: not typesafe yet }}
      <div style="padding: 300px">
        <CopyURLButton
          class="test-class"
          @url="https://hashicorp.com"
          @tooltipPlacement={{this.tooltipPlacement}}
        />
      </div>
    `);



    assert
      .dom("[data-test-copy-url-button]")
      .hasClass("test-class")
      .exists("The component renders with the correct class name");

    await triggerEvent("[data-test-copy-url-button]", "mouseenter");
    assert
      .dom(".hermes-tooltip")
      .hasAttribute(
        "data-tooltip-placement",
        "top",
        "The tooltip is rendered with the default placement"
      );

    await triggerEvent("[data-test-copy-url-button]", "mouseleave");

    this.set("tooltipPlacement", "bottom");

    await triggerEvent("[data-test-copy-url-button]", "mouseenter");

    assert
      .dom(".hermes-tooltip")
      .hasAttribute(
        "data-tooltip-placement",
        "bottom",
        "The tooltip can be rendered custom placement"
      );

    assert.dom(".hermes-tooltip .text").hasText("Copy URL");

    let clickPromise = click("[data-test-copy-url-button]");

    await waitFor("[data-url-copied=true]");

    assert.dom(".hermes-tooltip .text").hasText("Copied!");

    await clickPromise;
  });
});
