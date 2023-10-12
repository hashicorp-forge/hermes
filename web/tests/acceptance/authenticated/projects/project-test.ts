import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { authenticateSession } from "ember-simple-auth/test-support";
import { module, test, todo } from "qunit";
import { visit } from "@ember/test-helpers";
import { getPageTitle } from "ember-page-title/test-support";
import { setupApplicationTest } from "ember-qunit";

const ALL_PROJECTS_LINK = "[data-test-all-projects-link]";
const TITLE = "[data-test-project-title]";
const DESCRIPTION = "[data-test-project-description]";

interface AuthenticatedProjectsProjectRouteTestContext
  extends MirageTestContext {}

module("Acceptance | authenticated/projects/project", function (hooks) {
  setupApplicationTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(async function () {
    await authenticateSession({});
  });

  test("the page title is correct", async function (this: AuthenticatedProjectsProjectRouteTestContext, assert) {
    this.server.create("project", {
      id: 1,
      title: "Test Project",
    });

    await visit("/projects/1");

    assert.equal(getPageTitle(), "Test Project | Hermes");
  });

  test("it renders the expected elements (empty state)", async function (this: AuthenticatedProjectsProjectRouteTestContext, assert) {
    this.server.create("project", {
      id: 1,
      title: "Test Project",
    });

    await visit("/projects/1");

    assert.dom(ALL_PROJECTS_LINK).hasAttribute("href", "/projects");
    assert.dom(TITLE).hasText("Test Project");
    assert.dom(DESCRIPTION).hasText("Add a description");

    await this.pauseTest();
  });

  todo(
    "you can copy a project's URL",
    async function (
      this: AuthenticatedProjectsProjectRouteTestContext,
      assert,
    ) {
      assert.true(false);
    },
  );

  todo(
    "you can archive a project",
    async function (
      this: AuthenticatedProjectsProjectRouteTestContext,
      assert,
    ) {},
  );

  todo(
    "you can complete a project",
    async function (
      this: AuthenticatedProjectsProjectRouteTestContext,
      assert,
    ) {},
  );
});
