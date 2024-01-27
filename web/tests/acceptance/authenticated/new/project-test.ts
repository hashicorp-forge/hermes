import RouterService from "@ember/routing/router-service";
import { click, currentURL, fillIn, visit, waitFor } from "@ember/test-helpers";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { setupApplicationTest } from "ember-qunit";
import { authenticateSession } from "ember-simple-auth/test-support";
import { TEST_WEB_CONFIG, authenticateTestUser } from "hermes/mirage/utils";
import { Response } from "miragejs";
import { module, test } from "qunit";

const PROJECT_FORM = "[data-test-project-form]";
const HEADLINE = "[data-test-form-headline]";
const ICON = "[data-test-feature-icon]";
const TITLE_INPUT = `${PROJECT_FORM} [data-test-title]`;
const DESCRIPTION_INPUT = `${PROJECT_FORM} [data-test-description]`;
const SUBMIT_BUTTON = `${PROJECT_FORM} [data-test-submit]`;
const SECONDARY_CREATE_BUTTON = `${PROJECT_FORM} .hds-button--color-secondary`;
const PRIMARY_CREATE_BUTTON = `${PROJECT_FORM} .hds-button--color-primary`;
const TITLE_ERROR = `${PROJECT_FORM} [data-test-title-error]`;
const FLASH_MESSAGE = "[data-test-flash-notification]";
const TASK_IS_RUNNING_DESCRIPTION = "[data-test-task-is-running-description]";
const JIRA_INPUT = "[data-test-add-jira-input]";
const JIRA_PICKER_RESULT = "[data-test-jira-picker-result]";
const PROJECT_TITLE = "[data-test-project-title]";
const PROJECT_DESCRIPTION = "[data-test-project-description]";
const JIRA_LINK = "[data-test-jira-link]";

interface AuthenticatedNewProjectRouteTestContext extends MirageTestContext {}

module("Acceptance | authenticated/new/project", function (hooks) {
  setupApplicationTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(async function (
    this: AuthenticatedNewProjectRouteTestContext,
  ) {
    await authenticateSession({});
    authenticateTestUser(this);
  });

  test("the page title is correct", async function (this: AuthenticatedNewProjectRouteTestContext, assert) {
    await visit("/new/project");
    assert.equal(document.title, "Start a project | Hermes");
  });

  test("you can create a new project", async function (this: AuthenticatedNewProjectRouteTestContext, assert) {
    const key = "BAR-123";
    const summary = "foo";

    this.server.create("jira-picker-result", {
      key,
      summary,
    });

    this.server.create("jira-issue", {
      key,
      summary,
    });

    const title = "The Foo Project";
    const description = "A project about foo";

    await visit("new/project");

    await fillIn(TITLE_INPUT, title);
    await fillIn(DESCRIPTION_INPUT, description);
    await fillIn(JIRA_INPUT, summary);

    await click(JIRA_PICKER_RESULT);
    await click(SUBMIT_BUTTON);

    // Confirm that the project was created

    const project = this.server.schema.projects.find(1);

    assert.equal(project.title, title);
    assert.equal(project.description, description);
    assert.equal(project.jiraIssueID, key);

    // Confirm we were routed to the project screen

    const routerService = this.owner.lookup("service:router") as RouterService;

    assert.equal(
      routerService.currentRouteName,
      "authenticated.projects.project",
    );

    assert.equal(routerService.currentURL, "/projects/1");
    assert.equal(document.title, `${title} | Hermes`);

    assert.dom(PROJECT_TITLE).hasText(title);
    assert.dom(PROJECT_DESCRIPTION).hasText(description);
    assert.dom(JIRA_LINK).containsText(key);
  });

  test("it doesn't show a jira input if the jira_url config is not set", async function (this: AuthenticatedNewProjectRouteTestContext, assert) {
    this.server.get("/web/config", () => {
      return { ...TEST_WEB_CONFIG, jira_url: undefined };
    });

    await visit("new/project");

    assert.dom(JIRA_INPUT).doesNotExist();
  });

  test("it shows an error when the title is empty", async function (this: AuthenticatedNewProjectRouteTestContext, assert) {
    await visit("new/project");

    assert.dom(TITLE_ERROR).doesNotExist();

    await click(SUBMIT_BUTTON);

    assert.dom(TITLE_ERROR).hasText("Title is required.");
  });

  test("it shows a loading screen while a project is being created", async function (this: AuthenticatedNewProjectRouteTestContext, assert) {
    await visit("new/project");

    assert.dom(HEADLINE).hasText("Start a project");
    assert.dom(ICON).hasAttribute("data-test-icon", "folder");
    assert.dom(TASK_IS_RUNNING_DESCRIPTION).doesNotExist();

    await fillIn(TITLE_INPUT, "The Foo Project");

    const clickPromise = click(SUBMIT_BUTTON);

    await waitFor(TASK_IS_RUNNING_DESCRIPTION);

    assert.dom(HEADLINE).hasText("Creating project...");
    assert.dom(ICON).hasAttribute("data-test-icon", "running");
    assert
      .dom(TASK_IS_RUNNING_DESCRIPTION)
      .hasText("This shouldn't take long.");

    await clickPromise;
  });

  test("it shows an error if creating the project fails", async function (this: AuthenticatedNewProjectRouteTestContext, assert) {
    this.server.post("/projects", () => {
      return new Response(500, {}, {});
    });

    await visit("new/project");
    await fillIn(TITLE_INPUT, "The Foo Project");

    await click(SUBMIT_BUTTON);

    await waitFor(FLASH_MESSAGE);
    assert.dom(FLASH_MESSAGE).containsText("Error creating project");
  });

  test("the button changes color when the form is valid", async function (this: AuthenticatedNewProjectRouteTestContext, assert) {
    await visit("/new/project");

    assert.dom(SECONDARY_CREATE_BUTTON).exists();
    assert.dom(PRIMARY_CREATE_BUTTON).doesNotExist();

    await fillIn(TITLE_INPUT, "Foo");

    assert.dom(SECONDARY_CREATE_BUTTON).doesNotExist();
    assert.dom(PRIMARY_CREATE_BUTTON).exists();
  });
});
