import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import {
  type TestContext,
  click,
  render,
  triggerEvent,
  waitFor,
} from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import sinon from "sinon";
import type { Placement } from "@floating-ui/dom";

interface CopyURLButtonComponentTextContext extends TestContext {
  tooltipPlacement: Placement | undefined;
}

module("Integration | Component | copy-u-r-l-button", function (hooks) {
  setupRenderingTest(hooks);

  test("it renders as expected", async function (assert) {
    sinon.stub(navigator.clipboard, "writeText").resolves();
    sinon
      .stub(navigator.clipboard, "readText")
      .resolves("https://hashicorp.com");

    this.set("tooltipPlacement", undefined);

    // Render with padding so the tooltip has room on all sides:

    await render<CopyURLButtonComponentTextContext>(hbs`
      <div style="padding: 300px">
        <CopyURLButton
          class="test-class"
          @url="https://hashicorp.com"
          @tooltipPlacement={{this.tooltipPlacement}}
          @isIconOnly={{true}}
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

    assert.dom(".hermes-tooltip .text").hasText("Copy link");

    let clickPromise = click("[data-test-copy-url-button]");

    await waitFor("[data-url-copied=true]");

    assert.dom(".hermes-tooltip .text").hasText("Link copied!");

    await clickPromise;
  });

  test("the tooltip can be forced open", async function (assert) {
    await render<CopyURLButtonComponentTextContext>(hbs`
      <div style="padding: 300px">
        <CopyURLButton
          @url="https://hashicorp.com"
          @tooltipIsForcedOpen={{true}}
          @isIconOnly={{true}}
        />
      </div>
    `);

    assert.dom(".hermes-tooltip").exists("The tooltip is rendered");
  });

  test("the tooltip text can be overridden", async function (assert) {
    await render<CopyURLButtonComponentTextContext>(hbs`
      <div style="padding: 300px">
        <CopyURLButton
          @url="https://hashicorp.com"
          @tooltipIsForcedOpen={{true}}
          @tooltipText="Creating link..."
          @isIconOnly={{true}}
        />
      </div>
    `);

    assert.dom(".hermes-tooltip .text").hasText("Creating link...");
  });

  test("the icon can be overridden", async function (assert) {
    await render<CopyURLButtonComponentTextContext>(hbs`
      <div style="padding: 300px">
        <CopyURLButton
          @url="https://hashicorp.com"
          @tooltipIsForcedOpen={{true}}
          @icon="loading"
          @isIconOnly={{true}}
        />
      </div>
    `);

    assert.dom(".flight-icon").hasAttribute("data-test-icon", "loading");
  });
});
