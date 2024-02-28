import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { render, triggerEvent, waitUntil } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import htmlElement from "hermes/utils/html-element";

module("Integration | Modifier | tooltip", function (hooks) {
  setupRenderingTest(hooks);

  test("it renders", async function (assert) {
    await render(hbs`
      <div data-test-div {{tooltip "more information"}}>
        Hover or focus me
      </div>

      <button data-test-button {{tooltip "more information"}}>
        Hover or focus me
      </button>

      <span {{tooltip "more information" focusable=false}}>
        Hover or focus me
      </span>
    `);

    assert
      .dom("div")
      .hasAttribute(
        "tabindex",
        "0",
        "div is not focusable, so it's given a tabindex of 0",
      );

    assert
      .dom("button")
      .doesNotHaveAttribute(
        "tabindex",
        "button is focusable, so it's not given a tabindex",
      );

    assert.dom("span").hasAttribute("tabindex", "-1", "span is not focusable");

    let divTooltipSelector =
      "#" + htmlElement("[data-test-div]").getAttribute("aria-describedby");

    let buttonTooltipSelector =
      "#" + htmlElement("[data-test-button]").getAttribute("aria-describedby");

    assert.notEqual(
      divTooltipSelector,
      buttonTooltipSelector,
      "div and button have unique tooltip ids",
    );

    assert.dom(".hermes-tooltip").doesNotExist("tooltips hidden by default");

    await triggerEvent("[data-test-div]", "mouseenter");

    assert.dom(divTooltipSelector).exists("tooltip appears on mouseenter");

    await triggerEvent("[data-test-div]", "mouseleave");

    assert
      .dom(divTooltipSelector)
      .doesNotExist("tooltip disappears on mouseleave");

    let dataTestDiv = htmlElement("[data-test-div]");
    dataTestDiv.focus();

    assert.dom(divTooltipSelector).exists("tooltip appears on focusin");

    dataTestDiv.blur();

    assert
      .dom(divTooltipSelector)
      .doesNotExist("tooltip disappears on focusout");

    await triggerEvent("[data-test-button]", "mouseenter");

    assert.dom(buttonTooltipSelector).exists();

    await triggerEvent("[data-test-button]", "mouseleave");
  });

  test("it takes a placement argument", async function (assert) {
    await render(hbs`
      <div class="w-full h-full grid place-items-center">
        <div>
          <div data-test-one {{tooltip "more information"}}>
            Default ('top')
          </div>
          <div data-test-two {{tooltip "more information" placement="left-end"}}>
            Custom ('left-end')
          </div>
        </div>
      </div>
    `);

    let divOneTooltipSelector =
      "#" + htmlElement("[data-test-one]").getAttribute("aria-describedby");
    let divTwoTooltipSelector =
      "#" + htmlElement("[data-test-two]").getAttribute("aria-describedby");

    await triggerEvent("[data-test-one]", "mouseenter");

    assert
      .dom(divOneTooltipSelector)
      .hasAttribute(
        "data-tooltip-placement",
        "top",
        "tooltip is placed top by default",
      );

    await triggerEvent("[data-test-two]", "mouseenter");

    assert
      .dom(divTwoTooltipSelector)
      .hasAttribute(
        "data-tooltip-placement",
        "left-end",
        "tooltip can be custom placed",
      );
  });

  test("it can open on a delay", async function (assert) {
    await render(hbs`
      <div class="tip" {{tooltip "more information" _useTestDelay=true}}>
        Hover or focus me
      </div>
    `);

    let state = htmlElement(".tip").getAttribute("data-tooltip-state");

    assert.equal(state, "closed");

    await triggerEvent(".tip", "mouseenter");

    const tip = htmlElement(".tip");

    assert.equal(tip.getAttribute("data-tooltip-state"), "opening");

    await waitUntil(() => {
      return tip.getAttribute("data-tooltip-state") === "open";
    });

    await triggerEvent(".tip", "mouseleave");

    assert.equal(tip.getAttribute("data-tooltip-state"), "closed");
  });

  test("you can pass a class to the tooltip", async function (assert) {
    await render(hbs`
      <div class="tip" {{tooltip "more information" class="foo"}}>
        Hover or focus me
      </div>
    `);

    await triggerEvent(".tip", "mouseenter");

    assert.dom(".hermes-tooltip").hasClass("foo");
  });
});
