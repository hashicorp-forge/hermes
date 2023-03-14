import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { render, triggerEvent } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import assertedHTMLElement from "hermes/utils/asserted-html-element";

module("Integration | Modifier | tooltip", function (hooks) {
  setupRenderingTest(hooks);

  test("it renders", async function (assert) {
    this.set("placement", undefined);

    await render(hbs`
      <div data-test-div {{tooltip "more information"}}>
        Hover or focus me
      </div>

      <button data-test-button {{tooltip "more information"}}>
        Hover or focus me
      </button>
    `);

    assert
      .dom("div")
      .hasAttribute(
        "tabindex",
        "0",
        "div is not focusable, so it's given a tabindex of 0"
      );

    assert
      .dom("button")
      .doesNotHaveAttribute(
        "tabindex",
        "button is focusable, so it's not given a tabindex"
      );

    let divTooltipId =
      assertedHTMLElement("[data-test-div]").getAttribute("aria-describedby");

    let buttonTooltipId =
      assertedHTMLElement("[data-test-button]").getAttribute(
        "aria-describedby"
      );

    assert.dom(".hermes-tooltip").doesNotExist("tooltips hidden by default");

    await triggerEvent("[data-test-div]", "mouseenter");

    assert.dom(".hermes-tooltip").exists("tooltip appears on mouseenter");

    assert.equal(divTooltipId, assertedHTMLElement(".hermes-tooltip").id);


    await triggerEvent("[data-test-div]", "mouseleave");

    assert
      .dom(".hermes-tooltip")
      .doesNotExist("tooltip disappears on mouseleave");

    await triggerEvent("[data-test-div]", "focusin");

    assert.dom(".hermes-tooltip").exists("tooltip appears on focusin");

    await triggerEvent("[data-test-div]", "focusout");

    assert
      .dom(".hermes-tooltip")
      .doesNotExist("tooltip disappears on focusout");

    await triggerEvent("[data-test-button]", "mouseenter");

    assert.dom(".hermes-tooltip").exists();
    assert.equal(buttonTooltipId, assertedHTMLElement(".hermes-tooltip").id);

    assert.notEqual(
      divTooltipId,
      buttonTooltipId,
      "div and button have unique tooltip ids"
    );
  });
});
