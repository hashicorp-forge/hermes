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
const PROJECT_DESCRIPTION = `${PROJECT_TILE} [data-test-description]`;
const PROJECT_PRODUCT = `${PROJECT_TILE} [data-test-product]`;
const PROJECT_JIRA_TYPE = `${PROJECT_TILE} [data-test-jira-type]`;
const PROJECT_JIRA_KEY = `${PROJECT_TILE} [data-test-jira-key]`;

const SECONDARY_NAV = "[data-test-projects-nav]";

interface AuthenticatedProjectsRouteTestContext extends MirageTestContext {}
module("Acceptance | authenticated/projects", function (hooks) {
  setupApplicationTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(async function () {
    await authenticateSession({});
  });

  test("it redirects to the dashboard if the flag is not enabled", async function (this: AuthenticatedProjectsRouteTestContext, assert) {
    this.server.get("/web/config", () => {
      return new Response(
        200,
        {},
        {
          feature_flags: {
            projects: false,
          },
        },
      );
    });

    await visit("/projects");

    assert.equal(currentURL(), "/dashboard");
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
    let expectedDescriptions: string[] = [];
    let expectedProductCount = 0;
    let expectedKeys: string[] = [];
    let expectedJiraTypes: string[] = [];

    this.server.schema.projects
      .all()
      .models.forEach((project: HermesProject) => {
        expectedTitles.push(project.title);

        if (project.description) {
          expectedDescriptions.push(project.description);
        }

        if (project.jiraIssue) {
          expectedKeys.push(project.jiraIssue.key);
          expectedJiraTypes.push(project.jiraIssue.type);
        }

        if (project.products) {
          expectedProductCount += project.products.length;
        }
      });

    const renderedTitles = findAll(PROJECT_TITLE).map(
      (e) => e.textContent?.trim(),
    );

    const renderedDescriptions = findAll(PROJECT_DESCRIPTION).map(
      (e) => e.textContent?.trim(),
    );

    const renderedProductsCount = findAll(PROJECT_PRODUCT).length;

    const renderedKeys = findAll(PROJECT_JIRA_KEY).map(
      (e) => e.textContent?.trim(),
    );

    const renderedJiraTypes = findAll(PROJECT_JIRA_TYPE).map(
      (e) => e.textContent?.trim(),
    );

    assert.deepEqual(renderedTitles, expectedTitles);
    assert.deepEqual(renderedDescriptions, expectedDescriptions);
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

    await click(`${SECONDARY_NAV} [data-test-tab="completed"]`);

    assert
      .dom(PROJECT_TILE)
      .exists({ count: 2 }, "correct number of completed projects");
    assert.equal(currentURL(), "/projects?status=completed");

    await click(`${SECONDARY_NAV} [data-test-tab="archived"]`);

    assert
      .dom(PROJECT_TILE)
      .exists({ count: 3 }, "correct number of archived projects");
    assert.equal(currentURL(), "/projects?status=archived");

    await click(`${SECONDARY_NAV} [data-test-tab="active"]`);

    assert.dom(PROJECT_TILE).exists({ count: 1 });
    assert.equal(currentURL(), "/projects");
  });
});
