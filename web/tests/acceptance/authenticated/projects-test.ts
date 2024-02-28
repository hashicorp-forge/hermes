import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { authenticateSession } from "ember-simple-auth/test-support";
import { module, test } from "qunit";
import { click, currentURL, findAll, visit } from "@ember/test-helpers";
import { getPageTitle } from "ember-page-title/test-support";
import { setupApplicationTest } from "ember-qunit";
import { HermesProject } from "hermes/types/project";
import { Response } from "miragejs";
import { ProjectStatus } from "hermes/types/project-status";

const PROJECT_TILE = "[data-test-project-tile]";
const PROJECT_TITLE = `${PROJECT_TILE} [data-test-title]`;
const PROJECT_PRODUCT = `${PROJECT_TILE} [data-test-product]`;
const PROJECT_JIRA_TYPE = `${PROJECT_TILE} [data-test-issue-type-image]`;
const PROJECT_JIRA_KEY = `${PROJECT_TILE} [data-test-jira-key]`;
const NO_PROJECTS = "[data-test-no-projects]";
const SECONDARY_NAV = "[data-test-projects-nav]";
const ACTIVE_TAB = `${SECONDARY_NAV} [data-test-tab="active"]`;
const COMPLETED_TAB = `${SECONDARY_NAV} [data-test-tab="completed"]`;
const ARCHIVED_TAB = `${SECONDARY_NAV} [data-test-tab="archived"]`;

interface AuthenticatedProjectsRouteTestContext extends MirageTestContext {}
module("Acceptance | authenticated/projects", function (hooks) {
  setupApplicationTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(async function () {
    await authenticateSession({});
  });

  test("the page title is correct", async function (this: AuthenticatedProjectsRouteTestContext, assert) {
    await visit("/projects");

    assert.equal(getPageTitle(), "All Projects | Hermes");
  });

  test("it fetches a list of projects", async function (this: AuthenticatedProjectsRouteTestContext, assert) {
    this.server.createList("project", 3);

    await visit("/projects");

    assert.dom("[data-test-project]").exists({ count: 3 });

    let expectedTitles: string[] = [];
    let expectedProductCount = 0;
    let expectedKeys: string[] = [];
    let expectedJiraTypes: string[] = [];

    this.server.schema.projects
      .all()
      .models.forEach((project: HermesProject) => {
        expectedTitles.push(project.title);

        if (project.jiraIssueID) {
          const jiraIssue = this.server.schema.jiraIssues.findBy({
            key: project.jiraIssueID,
          });
          expectedKeys.push(jiraIssue.key);
          expectedJiraTypes.push(jiraIssue.issueType);
        }

        if (project.products) {
          expectedProductCount += project.products.length;
        }
      });

    const renderedTitles = findAll(PROJECT_TITLE).map(
      (e) => e.textContent?.trim(),
    );

    const renderedProductsCount = findAll(PROJECT_PRODUCT).length;

    const renderedKeys = findAll(PROJECT_JIRA_KEY).map(
      (e) => e.textContent?.trim(),
    );

    const renderedJiraTypes = findAll(PROJECT_JIRA_TYPE).map((e) =>
      e.getAttribute("alt"),
    );

    assert.deepEqual(renderedTitles, expectedTitles);
    assert.deepEqual(renderedProductsCount, expectedProductCount);
    assert.deepEqual(renderedKeys, expectedKeys);
    assert.deepEqual(renderedJiraTypes, expectedJiraTypes);
  });

  test("you can filter by status", async function (this: AuthenticatedProjectsRouteTestContext, assert) {
    this.server.createList("project", 1, { status: ProjectStatus.Active });
    this.server.createList("project", 2, { status: ProjectStatus.Completed });
    this.server.createList("project", 3, { status: ProjectStatus.Archived });

    await visit("/projects");
    assert
      .dom(PROJECT_TILE)
      .exists({ count: 1 }, "correct number of active projects");

    await click(COMPLETED_TAB);

    assert
      .dom(PROJECT_TILE)
      .exists({ count: 2 }, "correct number of completed projects");
    assert.equal(currentURL(), "/projects?status=completed");

    await click(ARCHIVED_TAB);

    assert
      .dom(PROJECT_TILE)
      .exists({ count: 3 }, "correct number of archived projects");
    assert.equal(currentURL(), "/projects?status=archived");

    await click(ACTIVE_TAB);

    assert.dom(PROJECT_TILE).exists({ count: 1 });
    assert.equal(currentURL(), "/projects");
  });

  test("it shows an empty state", async function (this: AuthenticatedProjectsRouteTestContext, assert) {
    this.server.get("/projects", () => {
      return new Response(200, {}, []);
    });

    await visit("/projects");

    // by default we're on the active tab
    assert.dom(NO_PROJECTS).containsText("No active projects");

    await click(COMPLETED_TAB);
    assert.dom(NO_PROJECTS).containsText("No completed projects");

    await click(ARCHIVED_TAB);
    assert.dom(NO_PROJECTS).containsText("No archived projects");
  });
});
