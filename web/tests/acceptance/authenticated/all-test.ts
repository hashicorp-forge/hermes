import { click, visit } from "@ember/test-helpers";
import { setupApplicationTest } from "ember-qunit";
import { module, test } from "qunit";
import { authenticateSession } from "ember-simple-auth/test-support";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { getPageTitle } from "ember-page-title/test-support";

const PRODUCT_BADGE_LINK_SELECTOR = ".product-badge-link";

interface AuthenticatedAllRouteTestContext extends MirageTestContext {}

module("Acceptance | authenticated/all", function (hooks) {
  setupApplicationTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(async function () {
    await authenticateSession({});
  });

  test("the page title is correct", async function (this: AuthenticatedAllRouteTestContext, assert) {
    await visit("/all");
    assert.equal(getPageTitle(), "All Docs | Hermes");
  });

  test("product area badges are clickable filters", async function (this: AuthenticatedAllRouteTestContext, assert) {
    // Note: "Vault" is the default product area in the Mirage factory.

    this.server.createList("document", 5);
    this.server.create("document", { product: "Labs" });

    await visit("/all");

    assert
      .dom(PRODUCT_BADGE_LINK_SELECTOR)
      .hasAttribute("href", "/all?product=%5B%22Vault%22%5D");

    // TODO: Set up a handler in Mirage to return filtered results.
  });
});
