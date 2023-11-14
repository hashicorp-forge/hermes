import { click, visit } from "@ember/test-helpers";
import { setupApplicationTest } from "ember-qunit";
import { module, test } from "qunit";
import { authenticateSession } from "ember-simple-auth/test-support";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { getPageTitle } from "ember-page-title/test-support";
import MockDate from "mockdate";

const PRODUCT_LINK_SELECTOR = ".product-link";
const TABLE_HEADER_CREATED_SELECTOR =
  "[data-test-sortable-table-header][data-test-attribute=modifiedTime]";

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

  test("documents are grouped by recency", async function (this: AuthenticatedMyRouteTestContext, assert) {
    const dateString = "2000-01-01T06:00:00.000-07:00";

    MockDate.set(dateString);

    const modifiedTime = new Date(dateString).getTime() / 1000;

    console.log("modifiedTime", modifiedTime);

    this.server.create("document", {
      modifiedTime,
    });

    this.server.create("document", {
      modifiedTime: 1,
    });

    await visit("/my");

    assert
      .dom(PRODUCT_LINK_SELECTOR)
      .hasAttribute("href", "/my?product=%5B%22Terraform%22%5D");

    MockDate.reset();
  });

  test("an owner filter is conditionally shown", async function (this: AuthenticatedMyRouteTestContext, assert) {});

  test("you can filter out drafts shared with you", async function (this: AuthenticatedMyRouteTestContext, assert) {});
});
