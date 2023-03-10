import { visit } from "@ember/test-helpers";
import { setupApplicationTest } from "ember-qunit";
import { module, test } from "qunit";
import { authenticateSession } from "ember-simple-auth/test-support";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { getPageTitle } from "ember-page-title/test-support";

interface AuthenticatedDraftsRouteTestContext extends MirageTestContext {}

module("Acceptance | authenticated/drafts", function (hooks) {
  setupApplicationTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(function () {
    authenticateSession({});
  });

  test("the page title is correct", async function (this: AuthenticatedDraftsRouteTestContext, assert) {
    this.server.create("me");

    await visit("/drafts");
    assert.equal(getPageTitle(), "My Drafts | Hermes");
  });
});
