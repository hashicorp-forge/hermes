import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { hbs } from "ember-cli-htmlbars";
import { setupWindowMock } from "ember-window-mock/test-support";
import window from "ember-window-mock";
import { click, render } from "@ember/test-helpers";

module("Integration | Component | modals/doc-created", function (hooks) {
  setupRenderingTest(hooks);
  setupWindowMock(hooks);

  test("it functions as expected", async function (assert) {
    this.set("isShown", true);

    this.set("close", () => {
      this.set("isShown", false);
    });

    await render(hbs`
      {{! @glint-nocheck: not typesafe yet }}
      {{#if this.isShown}}
      <Modals::DocCreated
        @close={{this.close}}
      />
      {{/if}}

    `);

    assert.dom("[data-test-doc-created-modal]").exists("Modal is shown");
    assert.equal(
      window.localStorage.getItem("docCreatedModalIsHidden"),
      null,
      "localStorage is not set"
    );

    await click("[data-test-doc-created-modal-checkbox]");
    await click("[data-test-doc-created-modal-button]");

    assert.equal(
      window.localStorage.getItem("docCreatedModalIsHidden"),
      "true",
      "localStorage set"
    );

    assert
      .dom("[data-test-doc-created-modal]")
      .doesNotExist("Close action called");
  });

  test("it doesn't show if the user has requested it not", async function (assert) {
    this.set("close", () => {});
    window.localStorage.setItem("docCreatedModalIsHidden", "true");

    await render(hbs`
      {{! @glint-nocheck: not typesafe yet }}
      <Modals::DocCreated
        @close={{this.close}}
      />
    `);

    assert.dom("[data-test-doc-created-modal]").doesNotExist("Modal is hidden");
  });
});
