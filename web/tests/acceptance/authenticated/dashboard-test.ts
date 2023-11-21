import { click, visit } from "@ember/test-helpers";
import { setupApplicationTest } from "ember-qunit";
import { module, test } from "qunit";
import { authenticateSession } from "ember-simple-auth/test-support";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { getPageTitle } from "ember-page-title/test-support";
import {
  TEST_USER_EMAIL,
  TEST_USER_GIVEN_NAME,
} from "hermes/utils/mirage-utils";

const RECENTLY_VIEWED_DOC_SELECTOR = "[data-test-recently-viewed-doc]";
const DOC_AWAITING_REVIEW = "[data-test-doc-awaiting-review]";
const WELCOME_MESSAGE = "[data-test-welcome-message]";
const NO_DOCS_PUBLISHED = "[data-test-no-docs-published]";
const NO_VIEWED_DOCS = "[data-test-no-viewed-docs]";
const ERROR_FETCHING_DOCS = "[data-test-error-fetching-documents]";

interface AuthenticatedDashboardRouteTestContext extends MirageTestContext {}

module("Acceptance | authenticated/dashboard", function (hooks) {
  setupApplicationTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(async function () {
    await authenticateSession({});
  });

  test("the page title is correct", async function (this: AuthenticatedDashboardRouteTestContext, assert) {
    await visit("/dashboard");
    assert.equal(getPageTitle(), "Dashboard | Hermes");
  });

  test("it lists recently viewed docs", async function (this: AuthenticatedDashboardRouteTestContext, assert) {
    this.server.create("recently-viewed-doc", { id: "1", isDraft: false });
    this.server.create("recently-viewed-doc", { id: "2", isDraft: true });

    this.server.create("document", { objectID: "1", title: "Foo" });
    this.server.create("document", { objectID: "2", title: "Bar" });

    await visit("/dashboard");

    assert.dom(RECENTLY_VIEWED_DOC_SELECTOR).exists({ count: 2 });

    assert
      .dom(`${RECENTLY_VIEWED_DOC_SELECTOR} a`)
      .containsText("Foo")
      .hasAttribute("href", "/document/1", "correct href for a published doc");

    assert
      .dom(`${RECENTLY_VIEWED_DOC_SELECTOR}:nth-child(2) a`)
      .containsText("Bar")
      .hasAttribute(
        "href",
        "/document/2?draft=true",
        "correct href for a draft",
      );
  });

  test("it shows docs awaiting review", async function (this: AuthenticatedDashboardRouteTestContext, assert) {
    const title = "Test title 25";

    this.server.create("document", {
      title,
      approvers: [TEST_USER_EMAIL],
      status: "In-Review",
    });

    await visit("/dashboard");

    assert.dom(DOC_AWAITING_REVIEW).exists({ count: 1 }).containsText(title);
  });

  test("it lists the latest docs", async function (this: AuthenticatedDashboardRouteTestContext, assert) {
    this.server.createList("document", 9);

    await visit("/dashboard");

    assert.dom("[data-test-latest-doc]").exists({ count: 9 });
  });

  test("it welcomes the logged-in user", async function (this: AuthenticatedDashboardRouteTestContext, assert) {
    await visit("/dashboard");

    assert
      .dom(WELCOME_MESSAGE)
      .containsText(
        `Welcome, ${TEST_USER_GIVEN_NAME}`,
        `displays the user's "given_name"`,
      );
  });

  test("if the latest docs is empty, it shows a message", async function (this: AuthenticatedDashboardRouteTestContext, assert) {
    await visit("/dashboard");

    assert.dom(NO_DOCS_PUBLISHED).exists();
  });

  test("if the recently viewed docs is empty, it shows a message", async function (this: AuthenticatedDashboardRouteTestContext, assert) {
    await visit("/dashboard");

    assert.dom(NO_VIEWED_DOCS).exists();
  });

  test("if fetching latest docs fails, it shows an error message", async function (this: AuthenticatedDashboardRouteTestContext, assert) {
    this.server.get("/documents", {}, 500);

    await visit("/dashboard");

    assert.dom(ERROR_FETCHING_DOCS).exists();

    this.server.get("/documents", {}, 200);

    await click(`${ERROR_FETCHING_DOCS} button`);

    assert.dom(ERROR_FETCHING_DOCS).doesNotExist();
    SVGFEDisplacementMapElement;
  });
});
