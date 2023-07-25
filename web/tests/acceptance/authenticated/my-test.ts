import { visit } from "@ember/test-helpers";
import { setupApplicationTest } from "ember-qunit";
import { module, test, todo } from "qunit";
import { authenticateSession } from "ember-simple-auth/test-support";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { getPageTitle } from "ember-page-title/test-support";

const PRODUCT_BADGE_LINK_SELECTOR = ".product-badge-link";

interface AuthenticatedMyRouteTestContext extends MirageTestContext {}

module("Acceptance | authenticated/my", function (hooks) {
  setupApplicationTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(async function () {
    await authenticateSession({});
  });

  test("the page title is correct", async function (this: AuthenticatedMyRouteTestContext, assert) {
    await visit("/my");
    assert.equal(getPageTitle(), "My Docs | Hermes");
  });

  test("product badges have the correct hrefs", async function (this: AuthenticatedMyRouteTestContext, assert) {
    this.server.create("document", {
      product: "Terraform",
    });

    await visit("/my");

    assert
      .dom(PRODUCT_BADGE_LINK_SELECTOR)
      .hasAttribute("href", "/my?product=%5B%22Terraform%22%5D");
  });

  todo(
    "product badges are clickable",
    async function (this: AuthenticatedMyRouteTestContext, assert) {
      assert.true(false);
    }
  );
});
