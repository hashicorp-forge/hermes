import { visit } from "@ember/test-helpers";
import { setupApplicationTest } from "ember-qunit";
import { module, test } from "qunit";
import { authenticateSession } from "ember-simple-auth/test-support";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { getPageTitle } from "ember-page-title/test-support";

interface AuthenticatedDashboardRouteTestContext extends MirageTestContext {}

module("Acceptance | authenticated/dashboard", function (hooks) {
  setupApplicationTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(async function () {
    await authenticateSession({});
  });

  test("the page title is correct", async function (this: AuthenticatedDashboardRouteTestContext, assert) {
    await visit("/dashboard");
    assert.equal(getPageTitle(), "Dashboard | Hermes");
  });

  test("it shows a list of docs awaiting review", async function (this: AuthenticatedDashboardRouteTestContext, assert) {
    this.server.create("document", {
      title: "Document to review",
      status: "In Review",
      approvers: ["testuser@example.com"],
    });

    this.server.create("document", {
      title: "Not a document to review",
      status: "In Review",
      approvers: ["foo@example.com"],
    });
    // mirage server needs to return a search based on owners filter rather than product

    await visit("/dashboard");

    await this.pauseTest();
  });
});
