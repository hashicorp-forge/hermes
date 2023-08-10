import { visit } from "@ember/test-helpers";
import { setupApplicationTest } from "ember-qunit";
import { module, test, todo } from "qunit";
import { authenticateSession } from "ember-simple-auth/test-support";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { getPageTitle } from "ember-page-title/test-support";

interface AuthenticatedDraftRouteTestContext extends MirageTestContext {}

module("Acceptance | authenticated/drafts", function (hooks) {
  setupApplicationTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(async function () {
    await authenticateSession({});
  });

  test("the page title is correct", async function (this: AuthenticatedDraftRouteTestContext, assert) {
    await visit("/drafts");
    assert.equal(getPageTitle(), "My Drafts | Hermes");
  });

  test("product badges have the correct hrefs", async function (this: AuthenticatedDraftRouteTestContext, assert) {
    this.server.create("document", {
      product: "Security",
    });

    await visit("/drafts");

    assert
      .dom(".product-badge-link")
      .hasAttribute("href", "/drafts?product=%5B%22Security%22%5D");
  });
});
