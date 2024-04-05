import { click, fillIn, visit } from "@ember/test-helpers";
import { setupApplicationTest } from "ember-qunit";
import { module, test, todo } from "qunit";
import { authenticateSession } from "ember-simple-auth/test-support";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { getPageTitle } from "ember-page-title/test-support";
import { FacetLabel } from "hermes/helpers/get-facet-label";
import { TEST_USER_2_EMAIL, TEST_USER_EMAIL } from "hermes/mirage/utils";

const TABLE_HEADER_CREATED_SELECTOR =
  "[data-test-sortable-table-header][data-test-attribute=createdTime]";
const DOC_TYPE_TOGGLE = `[data-test-facet-dropdown-trigger="${FacetLabel.DocType}"]`;
const DROPDOWN_ITEM = "[data-test-facet-dropdown-link]";
const DOC_LINK = "[data-test-document-link]";
const FILTERED_DOC_COUNT = "[data-test-filtered-doc-count]";
const ACTIVE_FILTER_LINK = "[data-test-active-filter-link]";
const CLEAR_ALL_LINK = "[data-test-clear-all-filters-link]";
const OWNER_LINK = "[data-test-owner-link]";
const OWNERS_INPUT = `[data-test-search-owners-input]`;
const OWNER_MATCH = "[data-test-x-dropdown-list-item-link-to]";

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
      owners: [TEST_USER_2_EMAIL],
    });

    await visit("/documents");

    assert.dom(DOC_LINK).exists({ count: 4 });
    assert.dom(ACTIVE_FILTER_LINK).doesNotExist();
    assert.dom(FILTERED_DOC_COUNT).doesNotExist();
    assert.dom(CLEAR_ALL_LINK).doesNotExist();

    await click(DOC_TYPE_TOGGLE);

    assert.dom(DROPDOWN_ITEM);

    await click(DROPDOWN_ITEM);

    assert.dom(DOC_LINK).exists({ count: 2 });
    assert.dom(ACTIVE_FILTER_LINK).exists({ count: 1 });
    assert.dom(FILTERED_DOC_COUNT).exists();
    assert.dom(CLEAR_ALL_LINK).exists();

    await click(ACTIVE_FILTER_LINK);

    assert.dom(DOC_LINK).exists({ count: 4 });

    await fillIn(OWNERS_INPUT, TEST_USER_2_EMAIL);

    assert.dom(OWNER_MATCH).containsText(TEST_USER_2_EMAIL);

    await click(OWNER_MATCH);

    assert.dom(DOC_LINK).exists({ count: 2 });
    assert.dom(ACTIVE_FILTER_LINK).containsText(TEST_USER_2_EMAIL);
  });

  test("owners are clickable", async function (this: AuthenticatedDocumentsRouteTestContext, assert) {
    this.server.create("document");

    await visit("/documents");

    assert
      .dom(OWNER_LINK)
      .hasAttribute(
        "href",
        `/documents?owners=%5B%22${encodeURIComponent(TEST_USER_EMAIL)}%22%5D`,
      );
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
