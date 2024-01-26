import { render, waitFor } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { setupRenderingTest } from "ember-qunit";
import { module, test } from "qunit";
import { RelatedHermesDocument } from "hermes/components/related-resources";
import { HermesDocument } from "hermes/types/document";
import { TEST_USER_EMAIL, TEST_USER_PHOTO } from "hermes/mirage/utils";

const AVATAR_LINK = "[data-test-document-owner-avatar]";
const AVATAR_IMAGE = `${AVATAR_LINK} img`;
const AVATAR_LOADING = `${AVATAR_LINK} [data-test-is-loading]`;
const AVATAR_FALLBACK = `${AVATAR_LINK} [data-test-fallback]`;
const TITLE = "[data-test-document-title]";
const DOC_NUMBER = "[data-test-document-number]";
const USER_NAME = "[data-test-document-owner-name]";
const STATUS = "[data-test-document-status]";
const TYPE = "[data-test-document-type]";
const THUMBNAIL_BADGE = "[data-test-doc-thumbnail-product-badge]";

interface DocTileMediumComponentContext extends MirageTestContext {
  doc: HermesDocument | RelatedHermesDocument;
}

module("Integration | Component | doc/tile-medium", function (hooks) {
  setupRenderingTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(async function (this: DocTileMediumComponentContext) {
    this.server.create("document", {
      title: "Bar",
      summary: "Bar",
      product: "Terraform",
      docNumber: "456",
      docType: "Bar",
      status: "WIP",
      owners: [TEST_USER_EMAIL],
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

  test("it can render HermesDocuments or RelatedHermesDocuments", async function (this: DocTileMediumComponentContext, assert) {
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

      assert.dom(AVATAR_IMAGE).hasAttribute("src", TEST_USER_PHOTO);

      assert.dom(TITLE).hasText(doc.title);
      assert.dom(DOC_NUMBER).hasText(docNumber);
      assert.dom(USER_NAME).hasText(doc.owners?.[0] as string);
      assert.dom(STATUS).hasText(doc.status);
      assert.dom(TYPE).hasText(docType);

      assert
        .dom(THUMBNAIL_BADGE)
        .hasAttribute("data-test-product", doc.product as string);
    }

    await render<DocTileMediumComponentContext>(
      hbs`<Doc::TileMedium @doc={{this.doc}} />`,
    );

    assertDocumentInfo(hermesDocument);

    this.set("doc", this.server.schema.relatedHermesDocument.first().attrs);

    const relatedHermesDocument = this.doc as RelatedHermesDocument;

    assertDocumentInfo(relatedHermesDocument);
  });

  test("the doc link has the correct url depending on whether its a draft", async function (this: DocTileMediumComponentContext, assert) {
    this.set("doc", this.server.schema.document.first().attrs);

    await render<DocTileMediumComponentContext>(
      hbs`<Doc::TileMedium @doc={{this.doc}} />`,
    );

    assert
      .dom("[data-test-document-link]")
      .hasAttribute("href", `/document/doc-0?draft=true`);

    this.server.schema.document.first().update({ status: "In-Review" });

    this.set("doc", this.server.schema.document.first().attrs);

    assert
      .dom("[data-test-document-link]")
      .hasAttribute("href", `/document/doc-0`);
  });

  test("it will load the owner avatar if it is not initially provided", async function (this: DocTileMediumComponentContext, assert) {
    const id = "123";
    this.server.create("document", {
      id: id,
      objectID: id,
      ownerPhotos: [TEST_USER_PHOTO],
    });

    this.server.create("related-hermes-document", {
      id: id,
      googleFileID: id,
      ownerPhotos: [],
    });

    this.set("doc", this.server.schema.relatedHermesDocument.find(id).attrs);
    const renderPromise = render<DocTileMediumComponentContext>(
      hbs`<Doc::TileMedium @doc={{this.doc}} />`,
    );

    await waitFor(AVATAR_LOADING);

    await renderPromise;

    assert.dom(AVATAR_LOADING).doesNotExist();

    assert.dom(AVATAR_IMAGE).hasAttribute("src", TEST_USER_PHOTO);
  });

  test("it will fall back to the default avatar if the owner photo is not available", async function (this: DocTileMediumComponentContext, assert) {
    const id = "123";
    this.server.create("document", {
      id: id,
      objectID: id,
      ownerPhotos: [],
    });

    this.server.create("related-hermes-document", {
      id: id,
      googleFileID: id,
      ownerPhotos: [],
    });

    this.set("doc", this.server.schema.relatedHermesDocument.find(id).attrs);

    const renderPromise = render<DocTileMediumComponentContext>(
      hbs`<Doc::TileMedium @doc={{this.doc}} />`,
    );

    await waitFor(AVATAR_LOADING);

    await renderPromise;

    assert.dom(AVATAR_LOADING).doesNotExist();
    assert.dom(AVATAR_IMAGE).doesNotExist();

    assert.dom(AVATAR_FALLBACK).exists();
  });
});
