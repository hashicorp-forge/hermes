import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { authenticateSession } from "ember-simple-auth/test-support";
import { module, test } from "qunit";
import { findAll, visit } from "@ember/test-helpers";
import { getPageTitle } from "ember-page-title/test-support";
import { setupApplicationTest } from "ember-qunit";
import { HermesProject } from "hermes/types/project";

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

    const expectedTitles = this.server.schema.projects
      .all()
      .models.map((project: HermesProject) => project.title);

    const renderedTitles = findAll("[data-test-project]").map(
      (e) => e.textContent?.trim(),
    );

    assert.deepEqual(renderedTitles, expectedTitles);
  });
});
