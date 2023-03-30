import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { findAll, render, select } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";

module("Integration | Component | document/sidebar", function (hooks) {
  setupRenderingTest(hooks);
  setupMirage(hooks);

  test("you can change a draft's product area", async function (this: MirageTestContext, assert) {
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
      <Document::Sidebar
        @profile={{this.profile}}
        @document={{this.document}}
        @deleteDraft={{this.noop}}
        @docType="RFC"
      />
    `);

    assert
      .dom("[data-test-sidebar-product-select]")
      .exists("drafts show a product select element")
      .hasValue("Test Product 1", "The document product is selected");

    assert
      .dom("[data-test-sidebar-doc-number]")
      .hasText("TST-001", "The document number is correct");

    const options = findAll("[data-test-sidebar-product-select] option");

    const expectedProducts = [
      "", // The first option is blank
      "Test Product 0",
      "Test Product 1",
      "Test Product 2",
    ];

    options.forEach((option: Element, index: number) => {
      assert.equal(
        option.textContent,
        expectedProducts[index],
        "the product is correct"
      );
    });

    await select("[data-test-sidebar-product-select]", "Test Product 0");

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
      .dom("[data-test-sidebar-doc-number]")
      .hasText("TST-000", "The document is patched with the correct docNumber");

    this.server.schema.document
      .findBy({ objectID: docID })
      .update("isDraft", false);

    refreshMirageDocument();

    assert
      .dom("[data-test-sidebar-product-select]")
      .doesNotExist("The product select is not shown for published documents");
  });
});
