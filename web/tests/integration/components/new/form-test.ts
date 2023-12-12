import { TestContext, find, render, waitUntil } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { setupRenderingTest } from "ember-qunit";
import { module, test } from "qunit";
import { animationsSettled } from "ember-animated/test-support";

const DEFAULT_FORM = "[data-test-new-form]";
const FORM_FOR_MODAL = "[data-test-new-form-for-modal]";

const TASK_IS_RUNNING_DESCRIPTION = "[data-test-task-is-running-description]";

const ICON = "[data-test-feature-icon]";
const HEADLINE = "[data-test-form-headline]";
const SUBMIT_BUTTON = "[data-test-submit]";

interface Context extends TestContext {
  taskIsRunning: boolean;
  buttonIsActive: boolean;
}

module("Integration | Component | new/form", function (hooks) {
  setupRenderingTest(hooks);

  test("it's formatted by default with additional elements", async function (assert) {
    this.set("taskIsRunning", false);
    this.set("buttonIsActive", false);

    await render<Context>(hbs`
      <New::Form
        @headline="Create new"
        @taskIsRunningHeadline="Creating..."
        @taskIsRunningDescription="This may take a while."
        @taskIsRunning={{this.taskIsRunning}}
        @buttonIsActive={{this.buttonIsActive}}
        @buttonText="Create"
        @icon="plus"
      />
    `);

    assert.dom(DEFAULT_FORM).exists();
    assert.dom(ICON).hasAttribute("data-test-icon", "plus");
    assert.dom(HEADLINE).exists().hasText("Create new");

    assert
      .dom(SUBMIT_BUTTON)
      .hasText("Create")
      .hasClass(
        "hds-button--color-secondary",
        "button style is secondary until it's set active",
      );

    this.set("buttonIsActive", true);

    assert
      .dom(SUBMIT_BUTTON)
      .hasClass(
        "hds-button--color-primary",
        "button style is primary when it's set active",
      );

    assert.dom(FORM_FOR_MODAL).doesNotExist();
    assert.dom(TASK_IS_RUNNING_DESCRIPTION).doesNotExist();

    this.set("taskIsRunning", true);

    assert.dom(ICON).hasAttribute("data-test-icon", "running");
    assert.dom(HEADLINE).hasText("Creating...");
    assert
      .dom(TASK_IS_RUNNING_DESCRIPTION)
      .exists()
      .hasText("This may take a while.");

    await animationsSettled();

    assert.dom(DEFAULT_FORM).doesNotExist();
    assert.dom(SUBMIT_BUTTON).doesNotExist();
  });

  test("it can be formatted for a modal without additional elements", async function (assert) {
    await render(hbs`
      <New::Form
        @buttonText="Create"
        @isModal={{true}}
      />
    `);

    assert.dom(DEFAULT_FORM).doesNotExist();
    assert.dom(ICON).doesNotExist();
    assert.dom(HEADLINE).doesNotExist();
    assert.dom(SUBMIT_BUTTON).doesNotExist();

    assert.dom(FORM_FOR_MODAL).exists();
  });
});
