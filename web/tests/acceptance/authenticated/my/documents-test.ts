import { click, visit } from "@ember/test-helpers";
import { setupApplicationTest } from "ember-qunit";
import { module, test } from "qunit";
import { authenticateSession } from "ember-simple-auth/test-support";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { getPageTitle } from "ember-page-title/test-support";
import MockDate from "mockdate";

const PRODUCT_LINK_SELECTOR = ".product-link";
const SORTABLE_HEADER = "[data-test-attribute=modifiedTime]";

interface AuthenticatedMyDocumentsRouteTestContext extends MirageTestContext {}

module("Acceptance | authenticated/my/documents", function (hooks) {
  setupApplicationTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(async function () {
    await authenticateSession({});
  });

  test("the page title is correct", async function (this: AuthenticatedMyDocumentsRouteTestContext, assert) {
    await visit("/my/documents");
    assert.equal(getPageTitle(), "My Docs | Hermes");
  });

  test("documents can be sorted by modified date", async function (this: AuthenticatedMyDocumentsRouteTestContext, assert) {
    this.server.createList("document", 2);

    await visit("/my/documents");

    assert
      .dom(SORTABLE_HEADER)
      .hasClass("active")
      .hasAttribute("href", "/my?sortBy=dateAsc");

    assert
      .dom(`${SORTABLE_HEADER} .flight-icon`)
      .hasAttribute("data-test-icon", "arrow-down");

    await click(SORTABLE_HEADER);

    assert.dom(SORTABLE_HEADER).hasClass("active").hasAttribute("href", "/my");

    assert
      .dom(`${SORTABLE_HEADER} .flight-icon`)
      .hasAttribute("data-test-icon", "arrow-up");
  });

  test("an owner filter is conditionally shown", async function (this: AuthenticatedMyDocumentsRouteTestContext, assert) {});

  test("you can filter out drafts shared with you", async function (this: AuthenticatedMyDocumentsRouteTestContext, assert) {});
});
