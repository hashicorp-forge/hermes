import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import {
  type TestContext,
  click,
  find,
  render,
  waitFor,
  waitUntil,
} from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { assert as emberAssert } from "@ember/debug";

const PRIMARY_BUTTON = "[data-test-document-modal-primary-button]";
const SECONDARY_BUTTON = "[data-test-document-modal-secondary-button]";
const ERROR = ".hds-alert";

interface DocumentModalTestContext extends TestContext {
  color?: string;
  headerText: string;
  errorTitle: string;
  bodyText?: string;
  taskButtonText: string;
  taskButtonLoadingText: string;
  taskButtonIcon?: string;
  taskButtonIsDisabled?: boolean;
  hideFooterWhileSaving?: boolean;
  close: () => void;
  task: () => Promise<void>;
}

const NOOP = () => {};

module("Integration | Component | document/modal", function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    this.set("close", NOOP);
    this.set("headerText", "Archive document?");
    this.set("errorTitle", "Error title");
    this.set("taskButtonText", "Yes, archive");
    this.set("taskButtonLoadingText", "Archiving...");
    this.set("taskButtonIcon", "archive");
    this.set("task", async () => {
      return new Promise((resolve) => setTimeout(resolve, 10));
    });
  });

  test("it renders correctly", async function (this: DocumentModalTestContext, assert) {
    await render<DocumentModalTestContext>(hbs`
      <Document::Modal
        @color="critical"
        @headerText={{this.headerText}}
        @bodyText="Are you sure you want to archive this document?"
        @errorTitle={{this.errorTitle}}
        @taskButtonLoadingText={{this.taskButtonLoadingText}}
        @taskButtonText={{this.taskButtonText}}
        @taskButtonIcon={{this.taskButtonIcon}}
        @close={{this.close}}
        @task={{this.task}}
      />
    `);

    assert
      .dom(".hds-modal")
      .hasClass("hds-modal--color-critical", "can take a @color argument");
    assert
      .dom(".hds-modal__header")
      .hasText("Archive document?", "can take a @headerText argument");

    assert
      .dom(".hds-modal__body")
      .hasText(
        "Are you sure you want to archive this document?",
        "can take a @bodyText argument",
      );

    const primaryButton = find(PRIMARY_BUTTON);

    emberAssert("primary button must exist", primaryButton);

    assert
      .dom(primaryButton)
      .hasText("Yes, archive", "can take a @taskButtonText argument");

    const primaryButtonIcon = primaryButton.querySelector(".flight-icon");

    assert
      .dom(primaryButtonIcon)
      .hasAttribute(
        "data-test-icon",
        "archive",
        "can take a @taskButtonIcon argument",
      );

    assert.dom(ERROR).doesNotExist("error is not shown by default");

    this.set("task", async () => {
      throw new Error("error");
    });

    await click(primaryButton);

    assert.dom(ERROR).exists("failed tasks show an error");
    assert.dom(`${ERROR} .hds-alert__title`).hasText("Error title");

    await click(".hds-alert__dismiss");

    assert.dom(ERROR).doesNotExist("error can be dismissed");
  });

  test("it yields a body block with a taskIsRunning property", async function (assert) {
    await render<DocumentModalTestContext>(hbs`
      <Document::Modal
        @color="critical"
        @headerText={{this.headerText}}
        @errorTitle={{this.errorTitle}}
        @taskButtonLoadingText={{this.taskButtonLoadingText}}
        @taskButtonText={{this.taskButtonText}}

        @taskButtonIcon={{this.taskButtonIcon}}
        @close={{this.close}}
        @task={{this.task}}
      >
        <:default as |modal|>
          <div data-test-body-block>
            {{! @glint-ignore - blocks not yet typed}}
            {{#if modal.taskIsRunning}}
              <span>running</span>
            {{else}}
              idle
            {{/if}}
          </div>
        </:default>

      </Document::Modal>
    `);

    assert.dom("[data-test-body-block]").hasText("idle");

    const clickPromise = click(PRIMARY_BUTTON);

    await waitFor("[data-test-body-block] span");

    assert
      .dom("[data-test-body-block]")
      .hasText("running", 'the component yields a "taskIsRunning" property');

    await clickPromise;
  });

  test("it shows a loading state when the primary task is running", async function (assert) {
    await render<DocumentModalTestContext>(hbs`
      <Document::Modal
        @color="critical"
        @headerText={{this.headerText}}
        @errorTitle={{this.errorTitle}}
        @taskButtonLoadingText={{this.taskButtonLoadingText}}
        @taskButtonText={{this.taskButtonText}}
        @taskButtonIcon={{this.taskButtonIcon}}
        @close={{this.close}}
        @task={{this.task}}
      />
    `);

    const iconSelector = PRIMARY_BUTTON + " .flight-icon";

    assert.dom(PRIMARY_BUTTON).hasText("Yes, archive");
    assert.dom(iconSelector).hasAttribute("data-test-icon", "archive");

    const clickPromise = click(PRIMARY_BUTTON);

    await waitUntil(() => {
      return find(PRIMARY_BUTTON)?.textContent?.trim() === "Archiving...";
    });

    assert.dom(iconSelector).hasAttribute("data-test-icon", "loading");

    await clickPromise;
  });

  test("the task button can be disabled by the parent component", async function (assert) {
    await render<DocumentModalTestContext>(hbs`
      <Document::Modal
        @color="critical"
        @headerText={{this.headerText}}
        @errorTitle={{this.errorTitle}}
        @taskButtonLoadingText={{this.taskButtonLoadingText}}
        @taskButtonText={{this.taskButtonText}}

        @taskButtonIcon={{this.taskButtonIcon}}
        @close={{this.close}}
        @task={{this.task}}
        @taskButtonIsDisabled={{true}}
      />
    `);

    assert.dom(PRIMARY_BUTTON).hasAttribute("disabled");
  });

  test("the close action runs when the modal is dismissed", async function (assert) {
    let count = 0;
    this.set("close", () => count++);

    await render<DocumentModalTestContext>(hbs`
      <Document::Modal
        @color="critical"
        @headerText={{this.headerText}}
        @errorTitle={{this.errorTitle}}
        @taskButtonLoadingText={{this.taskButtonLoadingText}}
        @taskButtonText={{this.taskButtonText}}

        @taskButtonIcon={{this.taskButtonIcon}}
        @close={{this.close}}
        @task={{this.task}}
      />
    `);

    await click(SECONDARY_BUTTON);
    await waitUntil(() => count === 1);

    assert.equal(count, 1);
  });

  test("the footer can be hidden while saving", async function (assert) {
    await render<DocumentModalTestContext>(hbs`
      <Document::Modal
        @headerText={{this.headerText}}
        @errorTitle={{this.errorTitle}}
        @taskButtonText={{this.taskButtonText}}
        @taskButtonLoadingText={{this.taskButtonLoadingText}}
        @hideFooterWhileSaving={{true}}
        @close={{this.close}}
        @task={{this.task}}
      />
    `);

    assert.dom("[data-test-document-modal-footer]").exists();

    const clickPromise = click(PRIMARY_BUTTON);

    await waitUntil(() => {
      return find("[data-test-document-modal-footer]") === null;
    });

    assert.dom("[data-test-document-modal-footer]").doesNotExist();

    await clickPromise;
  });

  test("the secondary button can be hidden", async function (assert) {
    await render<DocumentModalTestContext>(hbs`
      <Document::Modal
        @secondaryButtonIsHidden={{true}}
        @headerText={{this.headerText}}
        @close={{this.close}}
      />
    `);

    assert.dom(SECONDARY_BUTTON).doesNotExist();
  });

  test("errors are not shown when a full-modal task is running", async function (assert) {
    this.set("task", async () => {
      await new Promise((resolve) => setTimeout(resolve, 1));
      throw new Error("error");
    });

    await render<DocumentModalTestContext>(hbs`
      <Document::Modal
        @headerText={{this.headerText}}
        @errorTitle={{this.errorTitle}}
        @hideFooterWhileSaving={{true}}
        @task={{this.task}}
        @close={{this.close}}
      />
    `);

    await click(PRIMARY_BUTTON);

    assert.dom(ERROR).exists();

    const clickPromise = click(PRIMARY_BUTTON);

    await waitUntil(() => {
      return find(ERROR) === null;
    });

    await clickPromise;
  });
});
