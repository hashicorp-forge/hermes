import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { find, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { HermesDocument } from "hermes/types/document";
import { TEST_USER_2_EMAIL, TEST_USER_EMAIL } from "hermes/mirage/utils";

const LINK = "[data-test-doc-awaiting-review-link]";

const TITLE = "[data-test-document-title]";

const DOC_NUMBER = "[data-test-document-number]";

const AVATAR = "[data-test-doc-awaiting-review-owner-avatar]";

const TYPE = "[data-test-document-type]";

const STATE = "[data-test-document-state]";

interface DashboardDocsAwaitingReviewDocTestContext extends MirageTestContext {
  doc: HermesDocument;
}

module(
  "Integration | Component | dashboard/docs-awaiting-review/doc",
  function (hooks) {
    setupRenderingTest(hooks);
    setupMirage(hooks);

    test("it renders as expected", async function (this: DashboardDocsAwaitingReviewDocTestContext, assert) {
      this.server.create("document", {
        objectID: 10,
        title: "Foo",
        product: "Cloud Platform",
        status: "In Review",
        docType: "PRFAQ",
        owners: [TEST_USER_2_EMAIL],
        approvers: [TEST_USER_EMAIL],
      });

      this.set("doc", this.server.schema.document.first());

      await render<DashboardDocsAwaitingReviewDocTestContext>(hbs`
        <Dashboard::DocsAwaitingReview::Doc
          @doc={{this.doc}}
        />
      `);

      assert.dom(LINK).hasAttribute("href", "/document/10", "href is correct");
      assert.dom(TITLE).hasText("Foo", "text is correct");

      assert
        .dom(DOC_NUMBER)
        .hasText("HCP-001", "Shows the doc number and title");

      assert.dom(AVATAR).exists("avatar is shown");

      assert.dom(TYPE).hasText("PRFAQ", "Shows the doc type");
    });
  },
);
