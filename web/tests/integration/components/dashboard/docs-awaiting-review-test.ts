import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { HermesDocument } from "hermes/types/document";

const DOCS_AWAITING_REVIEW_COUNT_SELECTOR =
  "[data-test-docs-awaiting-review-count]";

const DOC_AWAITING_REVIEW_LINK_SELECTOR =
  "[data-test-doc-awaiting-review-link]";

interface DashboardDocsAwaitingReviewTestContext extends MirageTestContext {
  docs: HermesDocument[];
}

module(
  "Integration | Component | dashboard/docs-awaiting-review",
  function (hooks) {
    setupRenderingTest(hooks);
    setupMirage(hooks);

    test("it shows different text depending on the number of docs awaiting review", async function (this: DashboardDocsAwaitingReviewTestContext, assert) {
      this.server.create("document", {
        title: "Foo",
        status: "In Review",
        approvers: ["testuser@example.com"],
      });

      this.server.create("document", {
        title: "Bar",
        status: "In Review",
        approvers: ["testuser@example.com"],
      });

      this.set("docs", this.server.schema.document.all().models);

      await render<DashboardDocsAwaitingReviewTestContext>(
        hbs`<Dashboard::DocsAwaitingReview @docs={{this.docs}} />`
      );

      assert.dom(DOCS_AWAITING_REVIEW_COUNT_SELECTOR).containsText("2");
      assert.dom(DOC_AWAITING_REVIEW_LINK_SELECTOR).exists({ count: 2 });

      assert.dom("h2").containsText("documents awaiting your review");

      this.set("docs", [this.server.schema.document.first()]);

      assert.dom(DOCS_AWAITING_REVIEW_COUNT_SELECTOR).containsText("1");
      assert.dom(DOC_AWAITING_REVIEW_LINK_SELECTOR).exists({ count: 1 });

      assert.dom("h2").containsText("document awaiting your review");
    });
  }
);
