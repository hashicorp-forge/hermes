import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { find, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { HermesDocument } from "hermes/types/document";
import ProductAreasService from "hermes/services/product-areas";

const DOC_AWAITING_REVIEW_LINK_SELECTOR =
  "[data-test-doc-awaiting-review-link]";

const DOC_AWAITING_REVIEW_NUMBER_AND_TITLE_SELECTOR =
  "[data-test-doc-awaiting-review-number-and-title]";

const DOC_AWAITING_REVIEW_OWNER_SELECTOR =
  "[data-test-doc-awaiting-review-owner]";

const STATUS_BADGE = "[data-test-doc-awaiting-review-status]";

const DOC_AWAITING_REVIEW_DOCTYPE_BADGE_SELECTOR =
  "[data-test-doc-awaiting-review-doctype-badge]";

interface DashboardDocsAwaitingReviewDocTestContext extends MirageTestContext {
  doc: HermesDocument;
}

module(
  "Integration | Component | dashboard/docs-awaiting-review/doc",
  function (hooks) {
    setupRenderingTest(hooks);
    setupMirage(hooks);

    hooks.beforeEach(async function (
      this: DashboardDocsAwaitingReviewDocTestContext,
      assert,
    ) {
      const productAreasService = this.owner.lookup(
        "service:product-areas",
      ) as ProductAreasService;

      this.server.createList("product", 4);

      await productAreasService.fetch.perform();
    });

    test("it renders as expected", async function (this: DashboardDocsAwaitingReviewDocTestContext, assert) {
      this.server.create("document", {
        objectID: 10,
        title: "Foo",
        product: "Cloud Platform",
        status: "In Review",
        docType: "PRFAQ",
        owners: ["foo@example.com"],
        approvers: ["testuser@example.com"],
      });

      this.set("doc", this.server.schema.document.first());

      await render<DashboardDocsAwaitingReviewDocTestContext>(hbs`
        <Dashboard::DocsAwaitingReview::Doc
          @doc={{this.doc}}
        />
      `);

      assert
        .dom(DOC_AWAITING_REVIEW_LINK_SELECTOR)
        .containsText("Foo")
        .hasAttribute("href", "/document/10");

      assert
        .dom(
          find(
            `${DOC_AWAITING_REVIEW_LINK_SELECTOR} ${DOC_AWAITING_REVIEW_NUMBER_AND_TITLE_SELECTOR}`,
          ),
        )
        .hasText("HCP-001 Foo", "Shows the doc number and title");

      assert
        .dom(
          find(
            `${DOC_AWAITING_REVIEW_LINK_SELECTOR} ${DOC_AWAITING_REVIEW_OWNER_SELECTOR}`,
          ),
        )
        .hasText("foo@example.com", "Shows the doc owner");

      assert
        .dom(find(`${DOC_AWAITING_REVIEW_LINK_SELECTOR} ${STATUS_BADGE}`))
        .hasText("In review", "Shows the doc status");

      assert
        .dom(
          find(
            `${DOC_AWAITING_REVIEW_LINK_SELECTOR} ${DOC_AWAITING_REVIEW_DOCTYPE_BADGE_SELECTOR}`,
          ),
        )
        .hasText("PRFAQ", "Shows the doc type");
    });
  },
);
