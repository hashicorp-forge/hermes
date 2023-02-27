import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { click, find, render, waitFor, waitUntil } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";

const FACETS = {
  one: {},
  two: {},
  three: {},
  four: {},
  five: {},
  six: {},
  seven: {},
  eight: {},
  nine: {},
  ten: {},
  eleven: {},
};

const NOOP = () => {};

module("Integration | Component | document/modal", function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    this.set("close", NOOP);
    this.set("headerText", "Archive document?");
    this.set("errorIsShown", false);
    this.set("errorTitle", "Error title");
    this.set("errorDescription", "Error description");
    this.set("taskButtonText", "Yes, archive");
    this.set("taskButtonLoadingText", "Archiving...");
    this.set("taskButtonIcon", "archive");
    this.set("dismissError", () => {
      this.set("errorIsShown", false);
    });
    this.set("task", async () => {
      return new Promise((resolve) => setTimeout(resolve, 10));
    });
  });

  test("it renders correctly", async function (assert) {
    await render(hbs`
      <Document::Modal
        @color="critical"
        @headerText={{this.headerText}}
        @bodyText="Are you sure you want to archive this document?"
        @errorIsShown={{this.errorIsShown}}
        @errorTitle={{this.errorTitle}}
        @errorDescription={{this.errorDescription}}
        @taskButtonText={{this.taskButtonText}}
        @taskButtonLoadingText={{this.taskButtonLoadingText}}
        @taskButtonIcon={{this.taskButtonIcon}}
        @dismissError={{this.dismissError}}
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
        "can take a @bodyText argument"
      );

    const primaryButton = find("[data-test-document-modal-primary-button]");
    assert
      .dom(primaryButton)
      .hasText("Yes, archive", "can take a @taskButtonText argument");

    const primaryButtonIcon = primaryButton?.querySelector(".flight-icon");
    assert
      .dom(primaryButtonIcon)
      .hasAttribute(
        "data-test-icon",
        "archive",
        "can take a @taskButtonIcon argument"
      );

    assert.dom(".hds-alert").doesNotExist("error is not shown by default");

    this.set("errorIsShown", true);

    assert
      .dom(".hds-alert")
      .exists("error is shown when @errorIsShown is true");
    assert.dom(".hds-alert .hds-alert__title").hasText("Error title");
    assert
      .dom(".hds-alert .hds-alert__description")
      .hasText("Error description");

    await click(".hds-alert__dismiss");

    assert.dom(".hds-alert").doesNotExist("error can be dismissed");
  });

  test("it yields a body block with a taskIsRunning property", async function (assert) {
    await render(hbs`
      <Document::Modal
        @color="critical"
        @headerText={{this.headerText}}
        @errorIsShown={{this.errorIsShown}}
        @errorTitle={{this.errorTitle}}
        @errorDescription={{this.errorDescription}}
        @taskButtonText={{this.taskButtonText}}
        @taskButtonLoadingText={{this.taskButtonLoadingText}}
        @taskButtonIcon={{this.taskButtonIcon}}
        @dismissError={{this.dismissError}}
        @close={{this.close}}
        @task={{this.task}}
      >
        <:default as |modal|>
          <div data-test-body-block>
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

    const clickPromise = click("[data-test-document-modal-primary-button]");

    await waitFor("[data-test-body-block] span");

    assert
      .dom("[data-test-body-block]")
      .hasText("running", 'the component yields a "taskIsRunning" property');

    await clickPromise;
  });

  test("it shows a loading state when the primary task is running", async function (assert) {
    await render(hbs`
      <Document::Modal
        @color="critical"
        @headerText={{this.headerText}}
        @errorIsShown={{this.errorIsShown}}
        @errorTitle={{this.errorTitle}}
        @errorDescription={{this.errorDescription}}
        @taskButtonText={{this.taskButtonText}}
        @taskButtonLoadingText={{this.taskButtonLoadingText}}
        @taskButtonIcon={{this.taskButtonIcon}}
        @dismissError={{this.dismissError}}
        @close={{this.close}}
        @task={{this.task}}
      />
    `);

    const buttonSelector = "[data-test-document-modal-primary-button]";

    assert.dom(buttonSelector).hasText("Yes, archive");
    assert
      .dom("[data-test-document-modal-primary-button] .flight-icon")
      .hasAttribute("data-test-icon", "archive");

    const clickPromise = click(buttonSelector);

    await waitUntil(() => {
      return find(buttonSelector)?.textContent?.trim() === "Archiving...";
    });

    assert
      .dom(buttonSelector)
      .hasText(
        "Archiving...",
        "the button text changes to @taskButtonLoadingText when the task is running"
      );

    assert
      .dom("[data-test-document-modal-primary-button] .flight-icon")
      .hasAttribute("data-test-icon", "loading");

    await clickPromise;
  });

  test("the task button can be disabled by the parent component", async function (assert) {
    await render(hbs`
      <Document::Modal
        @color="critical"
        @headerText={{this.headerText}}
        @errorIsShown={{this.errorIsShown}}
        @errorTitle={{this.errorTitle}}
        @errorDescription={{this.errorDescription}}
        @taskButtonText={{this.taskButtonText}}
        @taskButtonLoadingText={{this.taskButtonLoadingText}}
        @taskButtonIcon={{this.taskButtonIcon}}
        @dismissError={{this.dismissError}}
        @close={{this.close}}
        @task={{this.task}}
        @taskButtonIsDisabled={{true}}
      />
    `);

    assert
      .dom("[data-test-document-modal-primary-button]")
      .hasAttribute("disabled");
  });

  test("the close action runs when the modal is dismissed", async function (assert) {
    let count = 0;
    this.set("close", () => count++);

    await render(hbs`
      <Document::Modal
        @color="critical"
        @headerText={{this.headerText}}
        @errorIsShown={{this.errorIsShown}}
        @errorTitle={{this.errorTitle}}
        @errorDescription={{this.errorDescription}}
        @taskButtonText={{this.taskButtonText}}
        @taskButtonLoadingText={{this.taskButtonLoadingText}}
        @taskButtonIcon={{this.taskButtonIcon}}
        @dismissError={{this.dismissError}}
        @close={{this.close}}
        @task={{this.task}}
      />
    `);

    await click("[data-test-document-modal-secondary-button]");
    assert.equal(count, 1, "the close action runs when the modal is dismissed");
  });
});
