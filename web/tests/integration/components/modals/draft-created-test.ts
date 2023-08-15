import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { hbs } from "ember-cli-htmlbars";
import { setupWindowMock } from "ember-window-mock/test-support";
import window from "ember-window-mock";
import { TestContext, click, render } from "@ember/test-helpers";
import { DRAFT_CREATED_LOCAL_STORAGE_KEY } from "hermes/components/modals/draft-created";

interface ModalsDraftCreatedTestContext extends TestContext {
  isShown: boolean;
  close: () => void;
}

module("Integration | Component | modals/draft-created", function (hooks) {
  setupRenderingTest(hooks);
  setupWindowMock(hooks);

  test("it functions as expected", async function (this: ModalsDraftCreatedTestContext, assert) {
    this.set("isShown", true);

    this.set("close", () => {
      this.set("isShown", false);
    });

    await render<ModalsDraftCreatedTestContext>(hbs`
      {{#if this.isShown}}
      <Modals::DraftCreated
        @close={{this.close}}
      />
      {{/if}}

    `);

    assert.dom("[data-test-draft-created-modal]").exists("Modal is shown");
    assert.equal(
      window.localStorage.getItem(DRAFT_CREATED_LOCAL_STORAGE_KEY),
      null,
      "localStorage is not set"
    );

    await click("[data-test-draft-created-modal-checkbox]");
    await click("[data-test-draft-created-modal-button]");

    assert.equal(
      window.localStorage.getItem(DRAFT_CREATED_LOCAL_STORAGE_KEY),
      "true",
      "localStorage set"
    );

    assert
      .dom("[data-test-draft-created-modal]")
      .doesNotExist("Close action called");
  });

  test("it doesn't show if the user has requested it not", async function (this: ModalsDraftCreatedTestContext, assert) {
    this.set("close", () => {});
    window.localStorage.setItem(DRAFT_CREATED_LOCAL_STORAGE_KEY, "true");

    await render<ModalsDraftCreatedTestContext>(hbs`
      <Modals::DraftCreated
        @close={{this.close}}
      />
    `);

    assert
      .dom("[data-test-draft-created-modal]")
      .doesNotExist("Modal is hidden");
  });
});
