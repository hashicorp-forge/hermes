import { click, visit } from "@ember/test-helpers";
import { setupApplicationTest } from "ember-qunit";
import { module, test, todo } from "qunit";
import { authenticateSession } from "ember-simple-auth/test-support";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { getPageTitle } from "ember-page-title/test-support";

const PRODUCT_BADGE_LINK_SELECTOR = ".product-badge-link";
const TABLE_HEADER_CREATED_SELECTOR =
  "[data-test-sortable-table-header][data-test-attribute=createdTime]";

interface AuthenticatedDocumentsRouteTestContext extends MirageTestContext {}
module("Acceptance | authenticated/documents", function (hooks) {
  setupApplicationTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(async function () {
    await authenticateSession({});
  });

  test("the page title is correct", async function (this: AuthenticatedDocumentsRouteTestContext, assert) {
    await visit("/documents");
    assert.equal(getPageTitle(), "All Docs | Hermes");
  });

  test("product badges have the correct hrefs", async function (this: AuthenticatedDocumentsRouteTestContext, assert) {
    this.server.create("document", {
      product: "Labs",
    });

    await visit("/documents");

    assert
      .dom(PRODUCT_BADGE_LINK_SELECTOR)
      .hasAttribute("href", "/documents?product=%5B%22Labs%22%5D");
  });

  test("documents can be sorted by created date", async function (this: AuthenticatedDocumentsRouteTestContext, assert) {
    this.server.createList("document", 2);

    await visit("/all");

    assert
      .dom(TABLE_HEADER_CREATED_SELECTOR)
      .hasClass("active")
      .hasAttribute("href", "/documents?sortBy=dateAsc");

    assert
      .dom(`${TABLE_HEADER_CREATED_SELECTOR} .flight-icon`)
      .hasAttribute("data-test-icon", "arrow-down");

    await click(TABLE_HEADER_CREATED_SELECTOR);

    assert
      .dom(TABLE_HEADER_CREATED_SELECTOR)
      .hasClass("active")
      .hasAttribute("href", "/documents");

    assert
      .dom(`${TABLE_HEADER_CREATED_SELECTOR} .flight-icon`)
      .hasAttribute("data-test-icon", "arrow-up");
  });

  /**
   * We want to test that clicking the product badge replaces filters
   * rather than compound them, but we don't yet have the Mirage
   * factories to support this.
   */
  todo(
    "product badges have the correct hrefs when other filters are active",
    async function (this: AuthenticatedDocumentsRouteTestContext, assert) {
      assert.true(false);
    }
  );
});
