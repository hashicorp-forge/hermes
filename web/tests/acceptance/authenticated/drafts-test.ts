import { currentURL, visit } from "@ember/test-helpers";
import { setupApplicationTest } from "ember-qunit";
import { module, test } from "qunit";
import { authenticateSession } from "ember-simple-auth/test-support";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";

interface AuthenticatedDraftRouteTestContext extends MirageTestContext {}

module("Acceptance | authenticated/drafts", function (hooks) {
  setupApplicationTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(async function () {
    await authenticateSession({});
  });

  test("it redirects to the my route", async function (this: AuthenticatedDraftRouteTestContext, assert) {
    await visit("/drafts");
    assert.equal(currentURL(), "/my/documents");
  });
});
