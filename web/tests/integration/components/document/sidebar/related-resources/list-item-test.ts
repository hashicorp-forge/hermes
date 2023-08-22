import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { click, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import {
  RelatedExternalLink,
  RelatedHermesDocument,
} from "hermes/components/document/sidebar/related-resources";
import htmlElement from "hermes/utils/html-element";

const RELATED_RESOURCE_SELECTOR = ".related-resource";
const RELATED_RESOURCE_LINK_SELECTOR = ".related-resource-link";
const OVERFLOW_BUTTON_SELECTOR = ".related-resource-overflow-button";
const OVERFLOW_MENU_BUTTON_SELECTOR =
  ".related-resources-overflow-menu-item-button";
const OVERFLOW_MENU_SELECTOR =
  "[data-test-related-resources-list-item-overflow-menu]";
const DROPDOWN_LIST_ITEM_SELECTOR = ".x-dropdown-list-item";

const RESOURCE_TITLE_SELECTOR = "[data-test-resource-title]";
const RESOURCE_SECONDARY_TEXT_SELECTOR = "[data-test-resource-secondary-text]";

interface DocumentSidebarRelatedResourcesListItemTestContext
  extends MirageTestContext {
  document: RelatedHermesDocument;
  externalResource: RelatedExternalLink;
  removeResource: () => void;
  editResource: () => void;
}

module(
  "Integration | Component | document/sidebar/related-resources/list-item",
  function (hooks) {
    setupRenderingTest(hooks);
    setupMirage(hooks);

    hooks.beforeEach(async function (
      this: DocumentSidebarRelatedResourcesListItemTestContext
    ) {
      this.server.create("document");

      const documentAttrs = this.server.schema.document.first().attrs;
      this.set("document", {
        googleFileID: documentAttrs.objectID,
        title: documentAttrs.title,
        type: documentAttrs.docType,
        documentNumber: documentAttrs.docNumber,
        sortOrder: 1,
      });
      this.set("externalResource", {
        url: "https://example.com/file/1234",
        name: "Example",
        sortOrder: 1,
      });
      this.set("removeResource", () => {});
      this.set("editResource", () => {});
    });

    test("it renders hermes docs and external links", async function (this: DocumentSidebarRelatedResourcesListItemTestContext, assert) {
      await render<DocumentSidebarRelatedResourcesListItemTestContext>(hbs`
        <Document::Sidebar::RelatedResources::ListItem
          @resource={{this.document}}
          @removeResource={{this.removeResource}}
          @editResource={{this.editResource}}
        />

        <Document::Sidebar::RelatedResources::ListItem
          @resource={{this.externalResource}}
          @removeResource={{this.removeResource}}
          @editResource={{this.editResource}}
        />
      `);

      assert.dom(RELATED_RESOURCE_SELECTOR).exists({ count: 2 });

      const firstListItemSelector = `${RELATED_RESOURCE_SELECTOR}:nth-child(1)`;
      const secondListItemSelector = `${RELATED_RESOURCE_SELECTOR}:nth-child(2)`;

      const firstListItem = htmlElement(firstListItemSelector);
      assert.dom(firstListItem).hasClass("hermes-document");
      assert
        .dom(`${firstListItemSelector} ${RELATED_RESOURCE_LINK_SELECTOR}`)
        .hasAttribute("data-test-item-type", "hermes-document");
      assert
        .dom(`${firstListItemSelector} ${RESOURCE_TITLE_SELECTOR}`)
        .hasText("Test Document 0");
      assert
        .dom(`${firstListItemSelector} ${RESOURCE_SECONDARY_TEXT_SELECTOR}`)
        .hasText("RFC · HCP-001");

      const secondListItem = htmlElement(secondListItemSelector);
      assert.dom(secondListItem).hasClass("external-resource");
      assert
        .dom(`${secondListItemSelector} ${RELATED_RESOURCE_LINK_SELECTOR}`)
        .hasAttribute("data-test-item-type", "external-resource");
      assert
        .dom(`${secondListItemSelector} ${RESOURCE_TITLE_SELECTOR}`)
        .hasText("Example");
      assert
        .dom(`${secondListItemSelector} ${RESOURCE_SECONDARY_TEXT_SELECTOR}`)
        .hasText("example.com");
    });

    test("documents can be removed", async function (this: DocumentSidebarRelatedResourcesListItemTestContext, assert) {
      // STUB FUNCTION UNTIL THIS IS DEVELOPED
      let count = 0;

      this.set("removeResource", () => {
        count++;
      });

      await render<DocumentSidebarRelatedResourcesListItemTestContext>(hbs`
        <Document::Sidebar::RelatedResources::ListItem
          @resource={{this.document}}
          @removeResource={{this.removeResource}}
          @editResource={{this.editResource}}
        />
      `);

      assert
        .dom(OVERFLOW_MENU_SELECTOR)
        .doesNotExist("overflow menu is hidden");

      await click(OVERFLOW_BUTTON_SELECTOR);

      assert.dom(OVERFLOW_MENU_SELECTOR).exists("overflow menu is visible");

      assert
        .dom(OVERFLOW_MENU_BUTTON_SELECTOR)
        .exists({ count: 1 }, "only one button is present for documents")
        .hasText("Remove", "remove button is present");

      await click(OVERFLOW_MENU_BUTTON_SELECTOR);

      assert.equal(count, 1, "remove button was clicked");
      assert
        .dom(OVERFLOW_MENU_SELECTOR)
        .doesNotExist("overflow menu is closed");
    });

    test("external resources can be edited or removed", async function (this: DocumentSidebarRelatedResourcesListItemTestContext, assert) {
      // STUB FUNCTIONS UNTIL THIS IS DEVELOPED
      let count = 0;

      this.set("removeResource", () => {
        count++;
      });

      this.set("editResource", () => {
        count++;
      });

      await render<DocumentSidebarRelatedResourcesListItemTestContext>(hbs`
        <Document::Sidebar::RelatedResources::ListItem
          @resource={{this.externalResource}}
          @removeResource={{this.removeResource}}
          @editResource={{this.editResource}}
        />
      `);

      await click(OVERFLOW_BUTTON_SELECTOR);

      assert
        .dom(OVERFLOW_MENU_BUTTON_SELECTOR)
        .exists({ count: 2 }, "two buttons are present for external resources");

      const editButton = htmlElement(
        `${DROPDOWN_LIST_ITEM_SELECTOR}:nth-child(1) button`
      );

      assert.dom(editButton).hasText("Edit", "edit button is present");

      await click(editButton);

      assert
        .dom("[data-test-edit-related-resource-modal]")
        .exists("edit modal is visible");

      assert
        .dom(OVERFLOW_MENU_SELECTOR)
        .doesNotExist("overflow menu is closed");

      await click("[data-test-edit-related-resource-modal-save-button]");
      assert.equal(count, 1, "edit button was clicked");

      await click(OVERFLOW_BUTTON_SELECTOR);

      const removeButton = htmlElement(
        `${DROPDOWN_LIST_ITEM_SELECTOR}:nth-child(2) button`
      );
      assert.dom(removeButton).hasText("Remove", "remove button is present");

      await click(removeButton);

      assert.equal(count, 2, "remove button was clicked");
    });
  }
);
