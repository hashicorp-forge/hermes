import { click, visit } from "@ember/test-helpers";
import { setupApplicationTest } from "ember-qunit";
import { module, test } from "qunit";
import { authenticateSession } from "ember-simple-auth/test-support";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { getPageTitle } from "ember-page-title/test-support";
import { TEST_USER_EMAIL } from "hermes/utils/mirage-utils";

const SORTABLE_HEADER = "[data-test-attribute=modifiedTime]";
const OWNER_FILTER = "[data-test-owner-filter]";
const TABLE_ROW = "[data-test-table-row]";
const EMAIL = "[data-test-person-email]";

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
      .hasAttribute("href", "/my/documents?sortBy=dateAsc");

    assert
      .dom(`${SORTABLE_HEADER} .flight-icon`)
      .hasAttribute("data-test-icon", "arrow-down");

    await click(SORTABLE_HEADER);

    assert
      .dom(SORTABLE_HEADER)
      .hasClass("active")
      .hasAttribute("href", "/my/documents");

    assert
      .dom(`${SORTABLE_HEADER} .flight-icon`)
      .hasAttribute("data-test-icon", "arrow-up");
  });

  test("you can filter out drafts shared with you", async function (this: AuthenticatedMyDocumentsRouteTestContext, assert) {
    const teammateEmail = "teammate@hashicorp.com";

    this.server.create("document");
    this.server.create("document", {
      owners: [teammateEmail],
      collaborators: [TEST_USER_EMAIL],
    });

    await visit("/my/documents");

    assert.dom(TABLE_ROW).exists({ count: 2 }, "Both documents are shown");

    const expectedOwners = [teammateEmail, "Me"];
    const actualOwners = Array.from(document.querySelectorAll(EMAIL)).map(
      (el) => el.textContent?.trim(),
    );

    assert.deepEqual(actualOwners, expectedOwners);

    await click(OWNER_FILTER);

    assert.dom(TABLE_ROW).exists({ count: 1 });

    assert
      .dom(document.querySelector(EMAIL))
      .hasText("Me", "Only my documents are shown");
  });
});
