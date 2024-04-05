import { module, test } from "qunit";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { setupRenderingTest } from "ember-qunit";
import { click, fillIn, find, render, waitFor } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { JiraPickerResult } from "hermes/types/project";
import {
  TEST_JIRA_WORKSPACE_URL,
  TEST_JIRA_ISSUE_SUMMARY,
  setWebConfig,
} from "hermes/mirage/utils";
import JiraIssueModel from "hermes/models/jira-issue";

const JIRA_ICON = "[data-test-jira-icon]";
const ADD_JIRA_INPUT = "[data-test-add-jira-input]";
const ADD_JIRA_BUTTON = "[data-test-add-jira-button]";
const KEY = "[data-test-jira-key]";
const SUMMARY = "[data-test-jira-summary]";
const LINK = "[data-test-jira-link]";
const ISSUE_TYPE_ICON = "[data-test-jira-issue-type-icon]";
const JIRA_WIDGET = "[data-test-jira-widget]";
const OVERFLOW_BUTTON = `${JIRA_WIDGET} [data-test-overflow-menu-button]`;
const REMOVE_JIRA_BUTTON = "[data-test-overflow-menu-action='remove']";
const PRIORITY_ICON = "[data-test-jira-priority-icon]";
const ASSIGNEE_AVATAR = "[data-test-jira-assignee-avatar-wrapper] img";
const STATUS = "[data-test-jira-status]";
const LOADING_ICON = "[data-test-jira-loading]";
const PICKER_DROPDOWN = "[data-test-jira-picker-dropdown]";
const PICKER_RESULT = "[data-test-jira-picker-result]";
const NO_MATCHES = "[data-test-no-matches]";
const SEARCHING_ICON = "[data-test-related-resources-search-loading-icon]";
const SEARCH_ICON = "[data-test-search-icon]";
const PLUS_ICON = "[data-test-add-jira-button-plus]";

interface Context extends MirageTestContext {
  contextIsForm: boolean;
  issue: JiraPickerResult | JiraIssueModel;
  isLoading: boolean;
  onIssueSelect: () => void;
  onIssueRemove: () => void;
}

module("Integration | Component | project/jira-widget", function (hooks) {
  setupRenderingTest(hooks);
  setupMirage(hooks);

  test("it can render for a form context (no issue attached)", async function (this: Context, assert) {
    await render<Context>(hbs`
      <Project::JiraWidget
        @isNewProjectForm={{true}}
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
    setWebConfig(this, "jira_url", TEST_JIRA_WORKSPACE_URL);

    /**
     * In the form context, we'll only ever have the truncated
     * JiraPickerResult issue, never the full JiraIssue.
     */
    const key = "ABC-123";
    const summary = "This is a summary";
    const url = "https://hashicorp.com";
    const issueTypeImage = "hashicorp.com/image.png";

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
        @isNewProjectForm={{true}}
        @issue={{this.issue}}
      />
    `);

    assert.dom(KEY).hasText(key);
    assert.dom(SUMMARY).hasText(summary);
    assert.dom(OVERFLOW_BUTTON).exists();

    // We don't assign the URL in the form context
    assert.dom(LINK).hasAttribute("href", "");

    assert.dom(ISSUE_TYPE_ICON).hasAttribute("src", issueTypeImage);

    // These are not shown in the form context
    assert.dom(PRIORITY_ICON).doesNotExist();
    assert.dom(ASSIGNEE_AVATAR).doesNotExist();
    assert.dom(STATUS).doesNotExist();
  });

  test("it can render outside of a form context (no issue attached)", async function (this: Context, assert) {
    await render<Context>(hbs`
      <Project::JiraWidget />
      <div class="click-away"/>
    `);

    assert.dom(ADD_JIRA_INPUT).doesNotExist();
    assert.dom(ADD_JIRA_BUTTON).exists();

    await click(ADD_JIRA_BUTTON);

    assert
      .dom(ADD_JIRA_INPUT)
      .exists("the input is shown when the button is clicked");

    assert
      .dom(ADD_JIRA_BUTTON)
      .doesNotExist("the button is hidden while the input is shown");

    await click(".click-away");

    assert
      .dom(ADD_JIRA_INPUT)
      .doesNotExist("the input is hidden when the user clicks outside");

    assert
      .dom(ADD_JIRA_BUTTON)
      .exists("the button is shown again when the input is hidden");
  });

  test("it can render in a non-form context (issue attached)", async function (this: Context, assert) {
    const key = "XYZ-123";
    const summary = "Foo";
    const url = "https://hashicorp.com/bar";
    const status = "Closed";
    const issueType = "Epic";
    const issueTypeImage = "https://hashicorp.com/image.png";
    const priority = "High";
    const priorityImage = "https://hashicorp.com/priority.png";
    const assignee = "Mishra";
    const assigneeAvatar = "https://hashicorp.com/avatar.png";

    this.server.create("jira-issue", {
      key,
      summary,
      url,
      status,
      issueType,
      issueTypeImage,
      priority,
      priorityImage,
      assignee,
      assigneeAvatar,
    });

    this.set("issue", this.server.schema.jiraIssues.first());

    await render<Context>(hbs`
      <Project::JiraWidget
        @issue={{this.issue}}
      />
    `);

    assert.dom(KEY).hasText(key);
    assert.dom(SUMMARY).hasText(summary);
    assert.dom(LINK).hasAttribute("href", url);
    assert
      .dom(ISSUE_TYPE_ICON)
      .hasAttribute("src", issueTypeImage)
      .hasAttribute("alt", issueType);

    assert
      .dom(PRIORITY_ICON)
      .hasAttribute("src", priorityImage)
      .hasAttribute("alt", priority);

    assert
      .dom(ASSIGNEE_AVATAR)
      .hasAttribute("src", assigneeAvatar)
      .hasAttribute("alt", assignee);

    assert.dom(STATUS).hasText(status);
  });

  test("it can be disabled", async function (this: Context, assert) {
    this.set("contextIsForm", false);

    await render<Context>(hbs`
      <Project::JiraWidget
        @isDisabled={{true}}
        @isNewProjectForm={{this.contextIsForm}}
      />
    `);

    assert.dom(ADD_JIRA_BUTTON).isDisabled();

    this.set("contextIsForm", true);

    assert.dom(ADD_JIRA_INPUT).isDisabled();
  });

  test("it can be loading", async function (this: Context, assert) {
    this.set("isLoading", true);

    await render<Context>(hbs`
      <Project::JiraWidget
        @isLoading={{this.isLoading}}
      />
    `);

    assert.dom(LOADING_ICON).exists();

    assert.dom(ADD_JIRA_BUTTON).doesNotExist();
    assert.dom(ADD_JIRA_INPUT).doesNotExist();

    this.set("isLoading", false);

    assert.dom(LOADING_ICON).doesNotExist();

    assert.dom(ADD_JIRA_BUTTON).exists();
    assert.dom(ADD_JIRA_INPUT).doesNotExist();
  });

  test("you can type to open the dropdown", async function (this: Context, assert) {
    this.server.create("jira-picker-result", {
      summary: "item",
    });

    await render<Context>(hbs`
      <Project::JiraWidget @isNewProjectForm={{true}} />
    `);

    assert.dom(PICKER_DROPDOWN).doesNotExist();

    await fillIn(ADD_JIRA_INPUT, "item");

    assert.dom(PICKER_DROPDOWN).exists();
    assert
      .dom(PICKER_RESULT)
      .exists({ count: 1 }, "it shows results for the query");

    await fillIn(ADD_JIRA_INPUT, "");

    assert
      .dom(PICKER_DROPDOWN)
      .doesNotExist("the dropdown hides when the input is cleared");

    await fillIn(ADD_JIRA_INPUT, "something else");

    assert.dom(PICKER_RESULT).doesNotExist();

    assert
      .dom(NO_MATCHES)
      .exists("it shows a no-matches message when there are no results");
  });

  test("it shows a search icon when searching", async function (this: Context, assert) {
    await render<Context>(hbs`
      <Project::JiraWidget @isNewProjectForm={{true}} />
    `);

    assert.dom(SEARCHING_ICON).doesNotExist();

    let fillInPromise = fillIn(ADD_JIRA_INPUT, "item");

    await waitFor(SEARCHING_ICON);

    await fillInPromise;

    assert.dom(SEARCHING_ICON).doesNotExist();
  });

  test("you can select a jira issue from the dropdown", async function (this: Context, assert) {
    const key = "ABC-123";
    const summary = "item";
    const url = "https://hashicorp.com";
    const issueTypeImage = "https://hashicorp.com/image.png";

    this.server.create("jira-picker-result", {
      key,
      summary,
      issueTypeImage,
      url,
    });

    await render<Context>(hbs`
      <Project::JiraWidget @isNewProjectForm={{true}} />
    `);

    await fillIn(ADD_JIRA_INPUT, "item");

    await click(PICKER_RESULT);

    assert.dom(KEY).hasText(key);
    assert.dom(SUMMARY).hasText(summary);
    assert
      .dom(LINK)
      .hasAttribute("href", "", "link is placeholder while contextIsForm");
    assert.dom(ISSUE_TYPE_ICON).hasAttribute("src", issueTypeImage);
  });

  test("you can remove a picked jira issue", async function (this: Context, assert) {
    this.server.create("jira-picker-result");

    await render<Context>(hbs`
      <Project::JiraWidget @isNewProjectForm={{true}}  />
      <div class="click-away"/>
    `);

    await fillIn(ADD_JIRA_INPUT, TEST_JIRA_ISSUE_SUMMARY);

    await click(PICKER_RESULT);

    assert.dom(KEY).exists();

    await click(OVERFLOW_BUTTON);

    await click(REMOVE_JIRA_BUTTON);

    assert.dom(KEY).doesNotExist();

    assert.dom(ADD_JIRA_INPUT).exists();
  });

  test("the query is reset when the dropdown is hidden (form context)", async function (this: Context, assert) {
    this.server.createList("jira-picker-result", 6, {
      summary: "item",
    });

    await render<Context>(hbs`
      <Project::JiraWidget @isNewProjectForm={{true}} />
      <div class="click-away"/>
    `);

    await fillIn(ADD_JIRA_INPUT, "item");

    assert.dom(PICKER_RESULT).exists({ count: 6 });

    await click(".click-away");

    assert.dom(PICKER_DROPDOWN).doesNotExist();

    assert
      .dom(ADD_JIRA_INPUT)
      .hasValue("", "the input is cleared when the dropdown is closed");

    await click(ADD_JIRA_INPUT);

    assert.dom(PICKER_DROPDOWN).doesNotExist("the results are also cleared");
  });

  test("the query is reset when the dropdown is hidden (non-form context)", async function (this: Context, assert) {
    this.server.createList("jira-picker-result", 6, {
      summary: "item",
    });

    await render<Context>(hbs`
      <Project::JiraWidget />
      <div class="click-away"/>
    `);

    await click(ADD_JIRA_BUTTON);

    await fillIn(ADD_JIRA_INPUT, "item");

    assert.dom(PICKER_RESULT).exists({ count: 6 });

    await click(".click-away");

    assert.dom(PICKER_DROPDOWN).doesNotExist();

    assert.dom(ADD_JIRA_INPUT).doesNotExist();

    await click(ADD_JIRA_BUTTON);

    assert.dom(ADD_JIRA_INPUT).hasValue("", "the input is cleared");

    assert.dom(PICKER_DROPDOWN).doesNotExist("the results are also cleared");
  });

  test("it can run an onSave action", async function (this: Context, assert) {
    let count = 0;
    this.set("onIssueSelect", () => count++);

    this.server.create("jira-picker-result", {
      summary: "item",
    });

    await render<Context>(hbs`
      <Project::JiraWidget
        @isNewProjectForm={{true}}
        @onIssueSelect={{this.onIssueSelect}}
      />
    `);

    await fillIn(ADD_JIRA_INPUT, "item");

    await click(PICKER_RESULT);

    assert.equal(count, 1, "the onSave action was called");
  });

  test("it can run an onRemove action", async function (this: Context, assert) {
    let count = 0;

    this.set("onIssueRemove", () => count++);

    this.set("issue", this.server.create("jira-picker-result"));

    await render<Context>(hbs`
      <Project::JiraWidget
        @isNewProjectForm={{true}}
        @issue={{this.issue}}
        @onIssueRemove={{this.onIssueRemove}}
      />
    `);

    await click(OVERFLOW_BUTTON);

    await click(REMOVE_JIRA_BUTTON);

    assert.equal(count, 1, "the onRemove action was called");
  });

  test("the input icons animate as expected", async function (this: Context, assert) {
    this.set("contextIsForm", false);

    await render<Context>(hbs`
      <Project::JiraWidget @isNewProjectForm={{this.contextIsForm}} />
      <div class="click-away"/>
    `);

    assert
      .dom(PLUS_ICON)
      .doesNotHaveClass(
        "animated-icon",
        "the plus icon does not initially have the animated class",
      );

    await click(ADD_JIRA_BUTTON);

    assert
      .dom(SEARCH_ICON)
      .hasClass(
        "animated-icon",
        "the search icon animates in when the input is shown",
      );

    await click(".click-away");

    assert
      .dom(PLUS_ICON)
      .hasClass(
        "animated-icon",
        "the plus icon animates in when the input is hidden",
      );

    this.set("contextIsForm", true);

    assert
      .dom(SEARCH_ICON)
      .doesNotHaveClass(
        "animated-icon",
        "the search icon does not animate in the form context",
      );
  });

  test("it can be rendered read-only", async function (this: Context, assert) {
    this.set("issue", this.server.create("jira-picker-result"));

    await render<Context>(hbs`
      <Project::JiraWidget
        @issue={{this.issue}}
        @isReadOnly={{true}}
      />
    `);
    assert.dom(LINK).exists();
    assert.dom(OVERFLOW_BUTTON).doesNotExist();

    this.set("issue", undefined);

    assert
      .dom(LINK)
      .doesNotExist(
        "the link is not rendered if read-only with an undefined issue",
      );
  });
});
