import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { find, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { assert as emberAssert } from "@ember/debug";

const CONTAINER_SELECTOR = ".truncated-text-container";

module("Integration | Component | truncated-text", function (hooks) {
  setupRenderingTest(hooks);

  test("it truncates text", async function (assert) {
    await render(hbs`
      <div style="width:275px">
        <TruncatedText style="font-size:28px;">
          This is a very long text that should be truncated
        </TruncatedText>
      </div>
    `);

    // TODO: Take Percy screenshot

    // <p> tag is used if no `tagName` is provided
    const container = find(`p${CONTAINER_SELECTOR}`);
    const text = find(`${CONTAINER_SELECTOR} > span`);

    emberAssert(
      "container must be an HTMLElement",
      container instanceof HTMLElement
    );
    emberAssert("text must be an HTMLElement", text instanceof HTMLElement);

    const containerWidth = container.offsetWidth;
    const textWidth = text.offsetWidth;

    assert.equal(containerWidth, 275);
    assert.true(containerWidth < textWidth);

    const containerFontSize = window.getComputedStyle(container).fontSize;
    const textFontSize = window.getComputedStyle(text).fontSize;

    assert.equal(containerFontSize, "13px"); // text-body-100 size
    assert.equal(textFontSize, "28px");
  });

  test("it truncates text with a custom tag", async function (assert) {
    await render(hbs`
      <div style="width:275px">
        <TruncatedText @tagName="h1" style="font-size:28px;">
          This is a very long text that should be truncated
        </TruncatedText>
      </div>
    `);

    assert.dom(`h1${CONTAINER_SELECTOR}`).exists("renders a custom tag");
  });

  test("it truncates text with a custom breakpoint", async function (assert) {
    await render(hbs`
      <div style="width:275px">
        <TruncatedText @startingBreakpoint="md" style="font-size:28px;">
          This is a very long text that should be truncated
        </TruncatedText>
      </div>
    `);

    assert.true(true, "TODO: implement this test");

    // TODO: use ember-window-mock to set the breakpoint to md
  });
});
