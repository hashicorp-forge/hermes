import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { click, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { HermesDocument } from "hermes/types/document";
import { TEST_USER_EMAIL } from "hermes/mirage/utils";

// Component-specific test selectors
const DOCS_AWAITING_REVIEW_COUNT_SELECTOR =
  "[data-test-docs-awaiting-review-count]";
const DOC_AWAITING_REVIEW_LINK_SELECTOR =
  "[data-test-doc-awaiting-review-link]";
const TOGGLE_SELECTOR = "[data-test-docs-awaiting-review-toggle]";
const TOGGLE_ICON = "[data-test-docs-awaiting-review-toggle-icon]";

interface DashboardDocsAwaitingReviewTestContext extends MirageTestContext {
  docs: HermesDocument[];
}

module(
  "Integration | Component | dashboard/docs-awaiting-review",
  function (hooks) {
    setupRenderingTest(hooks);
    setupMirage(hooks);

    test("it shows a toggle button when there are more than 4 docs awaiting review", async function (this: DashboardDocsAwaitingReviewTestContext, assert) {
      const docTitles = ["Foo", "Bar", "Baz", "Oof", "Zab"];

      docTitles.forEach((title) => {
        this.server.create("document", {
          title,
          status: "In Review",
          approvers: [TEST_USER_EMAIL],
        });
      });

      this.set("docs", this.server.schema.document.all().models);

      await render<DashboardDocsAwaitingReviewTestContext>(
        hbs`<Dashboard::DocsAwaitingReview @docs={{this.docs}} />`,
      );

      assert.dom(DOCS_AWAITING_REVIEW_COUNT_SELECTOR).containsText("5");
      assert.dom(DOC_AWAITING_REVIEW_LINK_SELECTOR).exists({ count: 4 });

      assert.dom(TOGGLE_SELECTOR).hasText("Show all");
      assert.dom(TOGGLE_ICON).hasAttribute("data-test-icon", "plus");

      await click(TOGGLE_SELECTOR);

      assert.dom(TOGGLE_SELECTOR).hasText("Show fewer");
      assert.dom(TOGGLE_ICON).hasAttribute("data-test-icon", "minus");

      assert.dom(DOC_AWAITING_REVIEW_LINK_SELECTOR).exists({ count: 5 });

      await click(TOGGLE_SELECTOR);

      assert.dom(TOGGLE_SELECTOR).hasText("Show all");
      assert.dom(TOGGLE_ICON).hasAttribute("data-test-icon", "plus");
      assert.dom(DOC_AWAITING_REVIEW_LINK_SELECTOR).exists({ count: 4 });

      // Set the count to 1 to remove the need for the toggle
      this.set("docs", [this.server.schema.document.first()]);

      assert
        .dom(TOGGLE_SELECTOR)
        .doesNotExist("toggle not shown when there's fewer than 4 docs");
    });
  },
);
