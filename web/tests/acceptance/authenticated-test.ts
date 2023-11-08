import { currentURL, visit } from "@ember/test-helpers";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { setupApplicationTest } from "ember-qunit";
import {
  authenticateSession,
  invalidateSession,
} from "ember-simple-auth/test-support";
import SessionService from "hermes/services/_session";
import ProductAreasService, {
  ProductArea,
} from "hermes/services/product-areas";
import { module, test } from "qunit";
import { startFactories } from "../mirage-helpers/utils";

interface AuthenticatedRouteTestContext extends MirageTestContext {}

module("Acceptance | authenticated", function (hooks) {
  setupApplicationTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(async function (this: AuthenticatedRouteTestContext) {
    await authenticateSession({});
    startFactories(this);
  });

  test("it redirects to the auth route if the session is not authenticated", async function (this: AuthenticatedRouteTestContext, assert) {
    await invalidateSession();
    await visit("/");

    assert.equal(currentURL(), "/authenticate");
  });

  test("after login, it redirects to the dashboard", async function (this: AuthenticatedRouteTestContext, assert) {
    await visit("/");
    assert.equal(currentURL(), "/dashboard");
  });

  test("after login, it fetches the product areas", async function (this: AuthenticatedRouteTestContext, assert) {
    this.server.db.emptyData();

    this.server.create("product", {
      name: "Foo",
      abbreviation: "BAR",
    });

    const productAreas = this.owner.lookup(
      "service:product-areas",
    ) as ProductAreasService;

    assert.equal(productAreas._index, null);

    await visit("/");

    assert.equal("Foo", Object.keys(productAreas.index)[0]);
    assert.equal("BAR", productAreas.index["Foo"]?.abbreviation);
  });

  test("after login, it kicks off a task to poll for expired auth", async function (this: AuthenticatedRouteTestContext, assert) {
    const session = this.owner.lookup("service:session") as SessionService;

    assert.true(session.pollForExpiredAuth.isIdle);

    await visit("/");

    assert.true(session.pollForExpiredAuth.isRunning);
  });
});
