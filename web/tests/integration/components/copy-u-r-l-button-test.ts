import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { click, render, triggerEvent, waitUntil } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";

module("Integration | Component | copy-u-r-l-button", function (hooks) {
  setupRenderingTest(hooks);

  test("it renders as expected", async function (assert) {
    this.set("tooltipPlacement", null);

    // Render with padding so the tooltip has room on all sides:

    await render(hbs`
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

    await triggerEvent(".test-class", "mouseenter");
    assert
      .dom(".hermes-tooltip")
      .hasAttribute(
        "data-tooltip-placement",
        "top",
        "The tooltip is rendered with the default placement"
      );

    await triggerEvent(".test-class", "mouseleave");

    this.set("tooltipPlacement", "bottom");

    await triggerEvent(".test-class", "mouseenter");

    assert
      .dom(".hermes-tooltip")
      .hasAttribute(
        "data-tooltip-placement",
        "bottom",
        "The tooltip can be rendered custom placement"
      );

    let clickPromise = click(".test-class");

    assert.dom(".hermes-tooltip .text").hasText("Copy URL");

    await waitUntil(() => {
      return (
        document.querySelector(".hermes-tooltip .text")?.textContent ===
        "Copied!"
      );
    });

    assert.dom(".hermes-tooltip .text").hasText("Copied!");

    await clickPromise;
  });
});
