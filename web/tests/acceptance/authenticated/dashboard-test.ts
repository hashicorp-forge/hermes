import { find, findAll, visit } from "@ember/test-helpers";
import { setupApplicationTest } from "ember-qunit";
import { module, test } from "qunit";
import { authenticateSession } from "ember-simple-auth/test-support";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { getPageTitle } from "ember-page-title/test-support";

const DOCS_AWAITING_REVIEW_COUNT_SELECTOR =
  "[data-test-docs-awaiting-review-count]";

const DOC_AWAITING_REVIEW_LINK_SELECTOR =
  "[data-test-doc-awaiting-review-link]";

const DOC_AWAITING_REVIEW_NUMBER_AND_TITLE_SELECTOR =
  "[data-test-doc-awaiting-review-number-and-title]";

const DOC_AWAITING_REVIEW_OWNER_SELECTOR =
  "[data-test-doc-awaiting-review-owner]";

const DOC_AWAITING_REVIEW_PRODUCT_BADGE_SELECTOR =
  "[data-test-doc-awaiting-review-product-badge]";

const DOC_AWAITING_REVIEW_DOCTYPE_BADGE_SELECTOR =
  "[data-test-doc-awaiting-review-doctype-badge]";

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

  test("it shows a list of docs awaiting review", async function (this: AuthenticatedDashboardRouteTestContext, assert) {
    this.server.create("document", {
      objectID: 10,
      title: "Foo",
      product: "Cloud Platform",
      status: "In Review",
      docType: "PRFAQ",
      owners: ["foo@example.com"],
      approvers: ["testuser@example.com"],
    });

    this.server.create("document", {
      objectID: 20,
      title: "Bar",
      product: "Test Product 0",
      status: "In Review",
      docType: "PRD",
      owners: ["bar@example.com"],
      approvers: ["testuser@example.com"],
    });

    this.server.create("document", {
      title: "Baz",
      status: "In Review",
      approvers: ["not_testuser@example.com"],
    });

    await visit("/dashboard");

    // TODO: Move most of this to the component test

    assert.dom(DOCS_AWAITING_REVIEW_COUNT_SELECTOR).hasText("2");

    assert.dom(DOC_AWAITING_REVIEW_LINK_SELECTOR).exists({ count: 2 });

    assert
      .dom(find(DOC_AWAITING_REVIEW_LINK_SELECTOR))
      .hasText("Foo")
      .hasAttribute("href", "/documents/10", "Links to the correct doc");

    assert
      .dom(
        find(
          `${DOC_AWAITING_REVIEW_LINK_SELECTOR} ${DOC_AWAITING_REVIEW_NUMBER_AND_TITLE_SELECTOR}`
        )
      )
      .hasText("TP0-001: Bar", "Shows the doc number and title");

    assert
      .dom(
        find(
          `${DOC_AWAITING_REVIEW_LINK_SELECTOR} ${DOC_AWAITING_REVIEW_OWNER_SELECTOR}`
        )
      )
      .hasText("foo@example.com", "Shows the doc owner");

    assert
      .dom(
        find(
          `${DOC_AWAITING_REVIEW_LINK_SELECTOR} ${DOC_AWAITING_REVIEW_PRODUCT_BADGE_SELECTOR}`
        )
      )
      .hasText("Cloud Platform", "Shows the product name");

    assert
      .dom(
        find(
          `${DOC_AWAITING_REVIEW_LINK_SELECTOR} ${DOC_AWAITING_REVIEW_DOCTYPE_BADGE_SELECTOR}`
        )
      )
      .hasText("PRFAQ", "Shows the doc type");
  });
});
