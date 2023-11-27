import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { authenticateSession } from "ember-simple-auth/test-support";
import { module, test } from "qunit";
import { currentURL, findAll, visit } from "@ember/test-helpers";
import { getPageTitle } from "ember-page-title/test-support";
import { setupApplicationTest } from "ember-qunit";
import { HermesProject } from "hermes/types/project";
import { Response } from "miragejs";

const PROJECT_TILE = "[data-test-project-tile]";
const PROJECT_TITLE = `${PROJECT_TILE} [data-test-title]`;
const PROJECT_DESCRIPTION = `${PROJECT_TILE} [data-test-description]`;
const PROJECT_PRODUCT = `${PROJECT_TILE} [data-test-product]`;
const PROJECT_JIRA_TYPE = `${PROJECT_TILE} [data-test-jira-type]`;
const PROJECT_JIRA_KEY = `${PROJECT_TILE} [data-test-jira-key]`;

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
    let expectedProducts: string[] = [];
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

        if (project.hermesDocuments) {
          project.hermesDocuments.forEach((doc) => {
            if (doc.product) {
              expectedProducts.push(doc.product);
            }
          });
        }
      });

    const renderedTitles = findAll(PROJECT_TITLE).map(
      (e) => e.textContent?.trim(),
    );

    const renderedDescriptions = findAll(PROJECT_DESCRIPTION).map(
      (e) => e.textContent?.trim(),
    );

    const renderedProducts = findAll(PROJECT_PRODUCT).map(
      (e) => e.textContent?.trim(),
    );

    const renderedKeys = findAll(PROJECT_JIRA_KEY).map(
      (e) => e.textContent?.trim(),
    );

    const renderedJiraTypes = findAll(PROJECT_JIRA_TYPE).map(
      (e) => e.textContent?.trim(),
    );

    assert.deepEqual(renderedTitles, expectedTitles);
    assert.deepEqual(renderedDescriptions, expectedDescriptions);
    assert.deepEqual(renderedProducts, expectedProducts);
    assert.deepEqual(renderedKeys, expectedKeys);
    assert.deepEqual(renderedJiraTypes, expectedJiraTypes);
  });
});
