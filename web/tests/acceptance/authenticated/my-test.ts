import { setupApplicationTest } from "ember-qunit";
import { module, test } from "qunit";
import { authenticateSession } from "ember-simple-auth/test-support";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { currentURL, visit } from "@ember/test-helpers";

module("Acceptance | authenticated/my", function (hooks) {
  setupApplicationTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(async function () {
    await authenticateSession({});
  });

  test("it redirects to the my/documents route", async function (this: MirageTestContext, assert) {
    await visit("/my");
    assert.equal(currentURL(), "/my/documents");
  });
});
