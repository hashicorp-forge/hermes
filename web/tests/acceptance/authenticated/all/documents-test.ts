import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { authenticateSession } from "ember-simple-auth/test-support";
import { module, test } from "qunit";
import { visit } from "@ember/test-helpers";
import { getPageTitle } from "ember-page-title/test-support";
import { setupApplicationTest } from "ember-qunit";

const PRODUCT_BADGE_LINK_SELECTOR = ".product-badge-link";

interface AuthenticatedAllDocumentsRouteTestContext extends MirageTestContext {}
module("Acceptance | authenticated/all/documents", function (hooks) {
  setupApplicationTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(async function () {
    await authenticateSession({});
  });

  test("the page title is correct", async function (this: AuthenticatedAllDocumentsRouteTestContext, assert) {
    await visit("/all/documents");
    assert.equal(getPageTitle(), "All Docs | Hermes");
  });

  test("product badges have the correct hrefs", async function (this: AuthenticatedAllDocumentsRouteTestContext, assert) {
    this.server.create("document", {
      product: "Labs",
    });

    await visit("/all/documents");

    assert
      .dom(PRODUCT_BADGE_LINK_SELECTOR)
      .hasAttribute("href", "/all/documents?product=%5B%22Labs%22%5D");
  });
});
