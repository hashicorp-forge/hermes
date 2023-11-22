import { click, visit } from "@ember/test-helpers";
import { setupApplicationTest } from "ember-qunit";
import { module, test } from "qunit";
import { authenticateSession } from "ember-simple-auth/test-support";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { getPageTitle } from "ember-page-title/test-support";

const TABLE_HEADER_CREATED_SELECTOR =
  "[data-test-sortable-table-header][data-test-attribute=createdTime]";
const DOCUMENT_LINK = "[data-test-document-link]";

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

  test("documents can be sorted by created date", async function (this: AuthenticatedDraftRouteTestContext, assert) {
    this.server.createList("document", 2);

    await visit("/drafts");

    assert
      .dom(TABLE_HEADER_CREATED_SELECTOR)
      .hasClass("active")
      .hasAttribute("href", "/drafts?sortBy=dateAsc");

    assert
      .dom(`${TABLE_HEADER_CREATED_SELECTOR} .flight-icon`)
      .hasAttribute("data-test-icon", "arrow-down");

    await click(TABLE_HEADER_CREATED_SELECTOR);

    assert
      .dom(TABLE_HEADER_CREATED_SELECTOR)
      .hasClass("active")
      .hasAttribute("href", "/drafts");

    assert
      .dom(`${TABLE_HEADER_CREATED_SELECTOR} .flight-icon`)
      .hasAttribute("data-test-icon", "arrow-up");
  });
});
