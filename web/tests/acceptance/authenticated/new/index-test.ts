import { visit, waitFor } from "@ember/test-helpers";
import { setupApplicationTest } from "ember-qunit";
import { module, test } from "qunit";
import { authenticateSession } from "ember-simple-auth/test-support";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { getPageTitle } from "ember-page-title/test-support";

interface AllRouteContext extends MirageTestContext {}

module("Acceptance | authenticated/new", function (hooks) {
  setupApplicationTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(function () {
    authenticateSession({});
  });

  test("the page title is correct", async function (this: AllRouteContext, assert) {
    await visit("/new");
    await waitFor("h1");
    assert.equal(getPageTitle(), "New Doc | Hermes");
  });
});
