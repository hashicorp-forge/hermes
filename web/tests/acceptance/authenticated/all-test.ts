import { visit } from "@ember/test-helpers";
import { setupApplicationTest } from "ember-qunit";
import { module, test, todo } from "qunit";
import { authenticateSession } from "ember-simple-auth/test-support";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import RouterService from "@ember/routing/router-service";

interface AuthenticatedAllRouteTestContext extends MirageTestContext {}

module("Acceptance | authenticated/all", function (hooks) {
  setupApplicationTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(async function () {
    await authenticateSession({});
  });
  test("it redirects to the documents route", async function (this: AuthenticatedAllRouteTestContext, assert) {
    await visit("/all");

    const routerService = this.owner.lookup("service:router") as RouterService;

    assert.equal(routerService.currentRouteName, "authenticated.documents");
  });
});
