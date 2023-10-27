import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { authenticateSession } from "ember-simple-auth/test-support";
import { module, test } from "qunit";
import { visit } from "@ember/test-helpers";
import { getPageTitle } from "ember-page-title/test-support";
import { setupApplicationTest } from "ember-qunit";

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
});
