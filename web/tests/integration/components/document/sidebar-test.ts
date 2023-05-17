import { module, test, todo } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { click, findAll, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { AuthenticatedUser } from "hermes/services/authenticated-user";
import { HermesDocument } from "hermes/types/document";

module("Integration | Component | document/sidebar", function (hooks) {
  setupRenderingTest(hooks);
  setupMirage(hooks);

  interface DocumentSidebarTestContext extends MirageTestContext {
    profile: AuthenticatedUser;
    document: HermesDocument;
    deleteDraft: () => {};
    docType: string;
  }

  todo("you can change a draft's product area", async function (this: DocumentSidebarTestContext, assert) {
    this.server.createList("product", 3);

    const docID = "test-doc-0";
    const profile = this.server.create("me");
    const document = this.server.create("document", {
      objectID: docID,
      isDraft: true,
      product: "Test Product 1",
    });

    this.set("profile", profile);
    this.set("document", document);
    this.set("noop", () => {});

    await render(hbs`
      {{! @glint-nocheck - not yet typed}}
      <Document::Sidebar
        @profile={{this.profile}}
        @document={{this.document}}
        @deleteDraft={{this.noop}}
        @docType="RFC"
      />
    `);

    const docNumberSelector = "[data-test-sidebar-doc-number]";
    const productSelectSelector = "[data-test-sidebar-product-select]";
    const productSelectTriggerSelector = "[data-test-badge-dropdown-trigger]";
    const productSelectDropdownItemSelector =
      "[data-test-product-select-badge-dropdown-item]";

    assert
      .dom(docNumberSelector)
      .hasText("TST-001", "The document number is correct");

    assert
      .dom(productSelectSelector)
      .exists("drafts show a product select element")
      .hasText("Test Product 1", "The document product is selected");

    await click(productSelectTriggerSelector);

    const options = findAll(productSelectDropdownItemSelector);

    const expectedProducts = [
      "Test Product 0",
      "Test Product 1",
      "Test Product 2",
    ];

    options.forEach((option: Element, index: number) => {
      assert.equal(
        option.textContent?.trim(),
        expectedProducts[index],
        "the product is correct"
      );
    });

    // FIXME: Test hangs here, maybe due to the refreshRoute() method
    // await click(productSelectDropdownItemSelector);

    /**
     * Mirage properties aren't reactive like Ember's, so we
     * need to manually update the document.
     */
    const refreshMirageDocument = () => {
      this.set(
        "document",
        this.server.schema.document.findBy({ objectID: docID })
      );
    };

    refreshMirageDocument();

    assert
      .dom(docNumberSelector)
      .hasText("TST-000", "The document is patched with the correct docNumber");

    this.server.schema.document
      .findBy({ objectID: docID })
      .update("isDraft", false);

    refreshMirageDocument();

    assert
      .dom(productSelectSelector)
      .doesNotExist("The product select is not shown for published documents");
  });
});
