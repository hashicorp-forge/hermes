import { visit } from "@ember/test-helpers";
import { setupApplicationTest } from "ember-qunit";
import { module, test } from "qunit";
import { authenticateSession } from "ember-simple-auth/test-support";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { getPageTitle } from "ember-page-title/test-support";
import ProductAreasService from "hermes/services/product-areas";

interface AuthenticatedResultsRouteTestContext extends MirageTestContext {}

module("Acceptance | authenticated/results", function (hooks) {
  setupApplicationTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(async function (this: AuthenticatedResultsRouteTestContext) {
    await authenticateSession({});
    const productAreasService = this.owner.lookup(
      "service:product-areas",
    ) as ProductAreasService;

    this.server.createList("product", 4);

    await productAreasService.fetch.perform();
  });

  test("the page title is correct", async function (this: AuthenticatedResultsRouteTestContext, assert) {
    await visit("/results");
    assert.equal(getPageTitle(), "Search Results | Hermes");
  });
});
