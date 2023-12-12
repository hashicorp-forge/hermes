import { module, test } from "qunit";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { setupRenderingTest } from "ember-qunit";
import { click, find, findAll, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import {
  HermesProject,
  JiraIssue,
  JiraPickerResult,
} from "hermes/types/project";
import { assert as emberAssert } from "@ember/debug";
import htmlElement from "hermes/utils/html-element";
import { RelatedHermesDocument } from "hermes/components/related-resources";
import { setFeatureFlag } from "hermes/utils/mirage-utils";
import { setupProductIndex } from "hermes/tests/mirage-helpers/utils";

const JIRA_ICON = "[data-test-jira-icon]";
const ADD_JIRA_INPUT = "[data-test-add-jira-input]";
const ADD_JIRA_BUTTON = "[data-test-add-jira-button]";
const KEY = "[data-test-jira-key]";
const SUMMARY = "[data-test-jira-summary]";
const LINK = "[data-test-jira-link]";
const ISSUE_TYPE_ICON = "[data-test-jira-issue-type-icon]";
const OVERFLOW_BUTTON = "[data-test-overflow-button]";
const PRIORITY_ICON = "[data-test-jira-priority-icon]";
const ASSIGNEE_AVATAR = "[data-test-jira-assignee-avatar]";
const STATUS = "[data-test-jira-status]";

interface Context extends MirageTestContext {
  contextIsForm: boolean;
  issue: JiraPickerResult | string;
}

module("Integration | Component | project/jira-widget", function (hooks) {
  setupRenderingTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(async function (this: Context) {});

  test("it can render for a form context (no issue attached)", async function (this: Context, assert) {
    await render<Context>(hbs`
      <Project::JiraWidget
        @contextIsForm={{true}}
       />
    `);

    assert
      .dom(JIRA_ICON)
      .doesNotExist('the jira icon is not shown when "contextIsForm" is true');

    assert
      .dom(ADD_JIRA_INPUT)
      .exists("the input is shown when contextIsForm is true");

    assert
      .dom(ADD_JIRA_BUTTON)
      .doesNotExist("the button is not shown when contextIsForm is true");

    assert
      .dom(ADD_JIRA_INPUT)
      .hasAttribute(
        "placeholder",
        "Search issues...",
        "the input has the correct placeholder",
      );

    assert.notEqual(
      document.activeElement,
      find(ADD_JIRA_INPUT),
      "the input is not autofocused",
    );
  });

  test("it can render for a form context (issue attached)", async function (this: Context, assert) {
    /**
     * In the form context, we'll only ever have the truncated
     * JiraPickerResult issue, never the full JiraIssue.
     */

    const key = "ABC-123";
    const summary = "This is a summary";
    const url = "https://hashicorp.com";
    const issueTypeImage = "https://hashicorp.com/image.png";

    this.server.create("jira-picker-result", {
      key,
      summary,
      url,
      issueTypeImage,
    });

    const issue = this.server.schema.jiraPickerResults.first();

    this.set("issue", issue);

    await render<Context>(hbs`
      <Project::JiraWidget
        @contextIsForm={{true}}
        @issue={{this.issue}}
      />
    `);

    assert.dom(KEY).hasText(key);
    assert.dom(SUMMARY).hasText(summary);
    assert.dom(LINK).hasAttribute("href", url);
    assert.dom(ISSUE_TYPE_ICON).hasAttribute("src", issueTypeImage);
    assert.dom(OVERFLOW_BUTTON).exists();

    // These are not shown in the form context
    assert.dom(PRIORITY_ICON).doesNotExist();
    assert.dom(ASSIGNEE_AVATAR).doesNotExist();
    assert.dom(STATUS).doesNotExist();
  });

  test("it can render outside of a form context (no issue attached)", async function (this: Context, assert) {
    await render<Context>(hbs`
      <Project::JiraWidget />
    `);

    assert.dom(JIRA_ICON).exists();
    assert.dom(ADD_JIRA_INPUT).doesNotExist();
    assert.dom(ADD_JIRA_BUTTON).exists();

    await click(ADD_JIRA_BUTTON);

    assert
      .dom(ADD_JIRA_INPUT)
      .exists("the input is shown when the button is clicked");

    assert
      .dom(ADD_JIRA_BUTTON)
      .doesNotExist("the button is hidden while the input is shown");

    await click("body");

    assert
      .dom(ADD_JIRA_INPUT)
      .doesNotExist("the input is hidden when the user clicks outside");

    assert
      .dom(ADD_JIRA_BUTTON)
      .exists("the button is shown again when the input is hidden");
  });

  test("it can render in a non-form context (issue attached)", async function (this: Context, assert) {
    await render<Context>(hbs``);
  });

  test("it can be disabled", async function (this: Context, assert) {
    await render<Context>(hbs``);
  });

  test("it can be saving", async function (this: Context, assert) {
    await render<Context>(hbs``);
  });

  test("it can be loading", async function (this: Context, assert) {
    await render<Context>(hbs``);
  });

  test("you can open and close the dropdown", async function (this: Context, assert) {
    await render<Context>(hbs``);
  });

  test("you can select a jira issue from the dropdown", async function (this: Context, assert) {
    await render<Context>(hbs``);
  });

  test("you can remove a jira issue", async function (this: Context, assert) {
    await render<Context>(hbs``);
  });

  test("the query and results are reset when the dropdown is hidden", async function (this: Context, assert) {
    await render<Context>(hbs``);
  });
});
