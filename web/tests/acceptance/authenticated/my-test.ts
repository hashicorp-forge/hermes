import { click, visit } from "@ember/test-helpers";
import { setupApplicationTest } from "ember-qunit";
import { module, test } from "qunit";
import { authenticateSession } from "ember-simple-auth/test-support";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { getPageTitle } from "ember-page-title/test-support";

const PRODUCT_BADGE_LINK_SELECTOR = ".product-badge-link";
const TABLE_HEADER_CREATED_SELECTOR =
  "[data-test-sortable-table-header][data-test-attribute=createdTime]";

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

  test("documents can be sorted by created date", async function (this: AuthenticatedMyRouteTestContext, assert) {
    this.server.createList("document", 2);

    await visit("/my");

    assert
      .dom(TABLE_HEADER_CREATED_SELECTOR)
      .hasClass("active")
      .hasAttribute("href", "/my?sortBy=dateAsc");

    assert
      .dom(`${TABLE_HEADER_CREATED_SELECTOR} .flight-icon`)
      .hasAttribute("data-test-icon", "arrow-down");

    await click(TABLE_HEADER_CREATED_SELECTOR);

    assert
      .dom(TABLE_HEADER_CREATED_SELECTOR)
      .hasClass("active")
      .hasAttribute("href", "/my");

    assert
      .dom(`${TABLE_HEADER_CREATED_SELECTOR} .flight-icon`)
      .hasAttribute("data-test-icon", "arrow-up");
  });

  test("product badges have the correct hrefs", async function (this: AuthenticatedMyRouteTestContext, assert) {
    this.server.create("document", {
      product: "Terraform",
    });

    await visit("/my");

    assert
      .dom(PRODUCT_BADGE_LINK_SELECTOR)
      .hasAttribute("href", "/all?product=%5B%22Terraform%22%5D");
  });
});
