import { click, visit } from "@ember/test-helpers";
import { setupApplicationTest } from "ember-qunit";
import { module, test, todo } from "qunit";
import { authenticateSession } from "ember-simple-auth/test-support";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { getPageTitle } from "ember-page-title/test-support";
import { FacetLabel } from "hermes/helpers/get-facet-label";

const TABLE_HEADER_CREATED_SELECTOR =
  "[data-test-sortable-table-header][data-test-attribute=createdTime]";
const DOC_TYPE_TOGGLE = `[data-test-facet-dropdown-trigger="${FacetLabel.DocType}"]`;
const DROPDOWN_ITEM = "[data-test-facet-dropdown-link]";
const DOC_LINK = "[data-test-document-link]";
const ACTIVE_FILTER_LINK = "[data-test-active-filter-link]";
const CLEAR_ALL_LINK = "[data-test-clear-all-filters-link]";

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

  test("documents can be sorted by created date", async function (this: AuthenticatedDocumentsRouteTestContext, assert) {
    this.server.createList("document", 2);

    await visit("/documents");

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

  test("filtering works as expected", async function (this: AuthenticatedDocumentsRouteTestContext, assert) {
    this.server.createList("document", 2, {
      docType: "RFC",
    });

    this.server.createList("document", 2, {
      docType: "PRD",
    });

    await visit("/documents");

    assert.dom(DOC_LINK).exists({ count: 4 });
    assert.dom(ACTIVE_FILTER_LINK).doesNotExist();
    assert.dom(CLEAR_ALL_LINK).doesNotExist();

    await click(DOC_TYPE_TOGGLE);

    assert.dom(DROPDOWN_ITEM);

    await click(DROPDOWN_ITEM);

    assert.dom(DOC_LINK).exists({ count: 2 });

    assert.dom(ACTIVE_FILTER_LINK).exists({ count: 1 });
    assert.dom(CLEAR_ALL_LINK).exists();

    await click(ACTIVE_FILTER_LINK);

    assert.dom(DOC_LINK).exists({ count: 4 });
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
    },
  );
});
