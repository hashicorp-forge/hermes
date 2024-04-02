import { render, waitFor } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { setupRenderingTest } from "ember-qunit";
import { module, test } from "qunit";
import { RelatedHermesDocument } from "hermes/components/related-resources";
import { HermesDocument } from "hermes/types/document";
import { assert as emberAssert } from "@ember/debug";
import {
  TEST_USER_EMAIL,
  TEST_USER_NAME,
  TEST_USER_PHOTO,
  authenticateTestUser,
} from "hermes/mirage/utils";

const AVATAR_LINK = "[data-test-document-owner-avatar]";
const AVATAR_IMAGE = `${AVATAR_LINK} img`;
const TITLE = "[data-test-document-title]";
const SUMMARY = "[data-test-document-summary]";
const DOC_NUMBER = "[data-test-document-number]";
const USER_NAME = "[data-test-document-owner-name]";
const STATUS = "[data-test-document-status]";
const TYPE = "[data-test-document-type]";
const THUMBNAIL_BADGE = "[data-test-doc-thumbnail-product-badge]";
const PRIMARY_CLICK_AREA = "[data-test-primary-click-area]";

interface Context extends MirageTestContext {
  doc: HermesDocument | RelatedHermesDocument;
  query: string;
  canBeReordered: boolean;
}

module("Integration | Component | doc/tile-medium", function (hooks) {
  setupRenderingTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(async function (this: Context) {
    authenticateTestUser(this);

    this.server.create("document", {
      title: "Bar",
      summary: "Bar",
      product: "Terraform",
      docNumber: "456",
      docType: "Bar",
      status: "WIP",
      owners: [TEST_USER_EMAIL],
      _snippetResult: undefined,
    });

    this.server.create("related-hermes-document", {
      title: "Foo",
      summary: "Foo",
      product: "Vault",
      documentNumber: "123",
      documentType: "Foo",
      status: "Approved",
      owners: [TEST_USER_EMAIL],
    });
  });

  test("it handles splattributes", async function (this: Context, assert) {
    this.set("doc", this.server.schema.document.first().attrs);

    await render<Context>(
      hbs`<Doc::TileMedium @doc={{this.doc}} class="unique-class" />`,
    );

    assert.dom(".unique-class").exists();
  });

  test("it can render HermesDocuments or RelatedHermesDocuments", async function (this: Context, assert) {
    this.set("doc", this.server.schema.document.first().attrs);

    const hermesDocument = this.doc as HermesDocument;

    function assertDocumentInfo(doc: HermesDocument | RelatedHermesDocument) {
      const docNumber = "docNumber" in doc ? doc.docNumber : doc.documentNumber;
      const docType = "docType" in doc ? doc.docType : doc.documentType;

      assert
        .dom(AVATAR_LINK)
        .hasAttribute(
          "href",
          `/documents?owners=%5B%22${encodeURIComponent(
            TEST_USER_EMAIL,
          )}%22%5D`,
        );

      emberAssert("summary is expected", doc.summary);

      assert.dom(AVATAR_IMAGE).hasAttribute("src", TEST_USER_PHOTO);
      assert.dom(TITLE).hasText(doc.title);
      assert.dom(SUMMARY).hasText(doc.summary);
      assert.dom(DOC_NUMBER).hasText(docNumber);
      assert.dom(USER_NAME).hasText(TEST_USER_NAME);
      assert.dom(STATUS).hasText(doc.status);
      assert.dom(TYPE).hasText(docType);

      assert
        .dom(THUMBNAIL_BADGE)
        .hasAttribute("data-test-product", doc.product);
    }

    await render<Context>(hbs`<Doc::TileMedium @doc={{this.doc}} />`);

    assertDocumentInfo(hermesDocument);

    this.set("doc", this.server.schema.relatedHermesDocument.first().attrs);

    const relatedHermesDocument = this.doc as RelatedHermesDocument;

    assertDocumentInfo(relatedHermesDocument);
  });

  test("it renders a snippet instead of a summary when possible", async function (this: Context, assert) {
    this.server.create("document", {
      id: "qwerty",
      objectID: "qwerty",
      title: "Bar",
      summary: "Bar",
      product: "Terraform",
      docNumber: "456",
      docType: "Bar",
      status: "WIP",
      owners: [TEST_USER_EMAIL],
      _snippetResult: {
        content: {
          value: "This is a snippet",
        },
      },
    });

    const doc = this.server.schema.document.find("qwerty").attrs;

    this.set("doc", doc);

    await render<Context>(hbs`<Doc::TileMedium @doc={{this.doc}} />`);

    assert.dom(SUMMARY).hasText(doc._snippetResult.content.value);
    assert.dom(SUMMARY).doesNotIncludeText(doc.summary);
  });

  test("the doc link has the correct url depending on whether its a draft", async function (this: Context, assert) {
    this.set("doc", this.server.schema.document.first().attrs);

    await render<Context>(hbs`<Doc::TileMedium @doc={{this.doc}} />`);

    assert
      .dom("[data-test-document-link]")
      .hasAttribute("href", `/document/doc-0?draft=true`);

    this.server.schema.document.first().update({ status: "In-Review" });

    this.set("doc", this.server.schema.document.first().attrs);

    assert
      .dom("[data-test-document-link]")
      .hasAttribute("href", `/document/doc-0`);
  });

  test("it takes a query argument for title highlighting", async function (this: Context, assert) {
    const query = "Foo";
    const title = `The ${query} document`;
    const doc = this.server.schema.relatedHermesDocument.first();

    doc.update({ title });

    this.set("doc", doc.attrs);
    this.set("query", query);

    await render<Context>(
      hbs`<Doc::TileMedium @doc={{this.doc}} @query={{this.query}} />`,
    );

    assert.dom(TITLE).hasText(title);
    assert.dom(`${TITLE} mark`).hasText(query);
  });

  test("when `canBeReordered` is true, the click affordance changes", async function (this: Context, assert) {
    this.set("doc", this.server.schema.document.first().attrs);
    this.set("canBeReordered", false);

    await render<Context>(hbs`
      <div style="width: 500px; position: relative;">
        <Doc::TileMedium
          @doc={{this.doc}}
          @canBeReordered={{this.canBeReordered}}
        />
      </div>
    `);

    assert.dom(PRIMARY_CLICK_AREA).hasStyle({ left: "0px", width: "500px" });

    this.set("canBeReordered", true);

    assert
      .dom(PRIMARY_CLICK_AREA)
      .hasStyle(
        { left: "-20px", width: "520px", right: "0px" },
        'when "canBeReordered" is true, the click area extends to the left by 20px to make room for the drag handle',
      );
  });
});
