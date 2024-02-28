import { module, test, todo } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import {
  click,
  fillIn,
  find,
  render,
  triggerEvent,
  waitFor,
  waitUntil,
} from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { HermesDocument } from "hermes/types/document";
import { Response } from "miragejs";
import { setupProductIndex } from "hermes/tests/mirage-helpers/utils";

const LOADING_ICON_SELECTOR = "[data-test-related-resources-list-loading-icon]";
const LIST_SELECTOR = "[data-test-related-resources-list]";
const LIST_ITEM_SELECTOR = ".related-resource";
const HERMES_DOCUMENT_SELECTOR = ".hermes-document";
const EXTERNAL_RESOURCE_SELECTOR = ".external-resource";
const HEADER_SELECTOR = ".sidebar-section-header";
const ERROR_MESSAGE_SELECTOR = ".failed-to-load-text";
const ERROR_BUTTON_SELECTOR = "[data-test-related-resources-error-button]";
const OVERFLOW_BUTTON_SELECTOR = ".overflow-button";
const EDIT_BUTTON_SELECTOR = "[data-test-overflow-menu-action='edit']";
const REMOVE_BUTTON_SELECTOR = "[data-test-overflow-menu-action='remove']";
const EDIT_MODAL_SELECTOR = "[data-test-add-or-edit-external-resource-modal]";
const EDIT_MODAL_HEADER_SELECTOR = `${EDIT_MODAL_SELECTOR} [data-test-modal-header]`;
const EDIT_RESOURCE_SAVE_BUTTON_SELECTOR = `${EDIT_MODAL_SELECTOR} [data-test-save-button]`;
const ADD_EXTERNAL_RESOURCE_MODAL_DELETE_BUTTON_SELECTOR = `${EDIT_MODAL_SELECTOR} [data-test-delete-button]`;
const EXTERNAL_RESOURCE_TITLE_INPUT_SELECTOR = ".external-resource-title-input";
const EDIT_RESOURCE_URL_INPUT_SELECTOR =
  "[data-test-external-resource-url-input]";
const ADD_RESOURCE_BUTTON_SELECTOR =
  "[data-test-sidebar-section-header-button]";
const ADD_RESOURCE_MODAL_SELECTOR = "[data-test-add-related-resource-modal]";

const ADD_RELATED_RESOURCES_DOCUMENT_OPTION_SELECTOR =
  ".related-document-option";
const ADD_RELATED_RESOURCES_SEARCH_INPUT_SELECTOR =
  "[data-test-related-resources-search-input]";
const ADD_EXTERNAL_RESOURCE_SUBMIT_BUTTON_SELECTOR = `[data-test-add-fallback-external-resource] [data-test-submit-button]`;
const EDIT_EXTERNAL_RESOURCE_ERROR_SELECTOR =
  "[data-test-external-resource-title-error]";
const RESOURCE_TITLE_SELECTOR = "[data-test-resource-title]";
const RESOURCE_SECONDARY_TEXT_SELECTOR = "[data-test-resource-secondary-text]";
const TOOLTIP_TRIGGER_SELECTOR = "[data-test-tooltip-icon-trigger]";
const TOOLTIP_SELECTOR = ".hermes-tooltip";

interface DocumentSidebarRelatedResourcesTestContext extends MirageTestContext {
  document: HermesDocument;
  body: HTMLElement;
  editingIsDisabled: boolean;
}

module(
  "Integration | Component | document/sidebar/related-resources",
  function (hooks) {
    setupRenderingTest(hooks);
    setupMirage(hooks);

    hooks.beforeEach(async function (
      this: DocumentSidebarRelatedResourcesTestContext,
    ) {
      this.server.create("document", {
        product: "Labs",
        objectID: "1234",
      });

      // Populate the database with at least one more doc.
      this.server.create("document", {
        title: "Foobar",
        product: "Labs",
        objectID: "4321",
      });

      this.set("document", this.server.schema.document.first().attrs);
      const bodyDiv = document.createElement("div");
      this.set("body", bodyDiv);

      await setupProductIndex(this);
    });

    test("the empty state is conditionally clickable to add a resource", async function (this: DocumentSidebarRelatedResourcesTestContext, assert) {
      this.set("editingIsDisabled", true);

      await render<DocumentSidebarRelatedResourcesTestContext>(hbs`
        <Document::Sidebar::RelatedResources
          @productArea={{this.document.product}}
          @objectID={{this.document.objectID}}
          @editingIsDisabled={{this.editingIsDisabled}}
          @headerTitle="Test title"
          @modalHeaderTitle="Add related resource"
          @modalInputPlaceholder="Paste a URL or search documents..."
          @scrollContainer={{this.body}}
        />
      `);

      const readOnlyValue = "div.field-toggle.read-only";
      const interactiveEmptyState = "button.field-toggle";

      assert.dom(readOnlyValue).hasText("None");
      assert.dom(interactiveEmptyState).doesNotExist();

      // Enable editing
      this.set("editingIsDisabled", false);

      assert.dom(readOnlyValue).doesNotExist();
      assert.dom(interactiveEmptyState).hasText("None");

      await click("[data-test-related-resources-list-empty-state]");

      assert.dom(ADD_RESOURCE_MODAL_SELECTOR).exists();
    });

    test("it renders the related resources list", async function (this: DocumentSidebarRelatedResourcesTestContext, assert) {
      this.server.create("relatedHermesDocument", {
        id: 1,
      });
      this.server.create("relatedHermesDocument", {
        id: 2,
      });
      this.server.create("relatedExternalLink", {
        id: 3,
      });
      this.server.create("relatedExternalLink", {
        id: 4,
      });

      const renderPromise =
        render<DocumentSidebarRelatedResourcesTestContext>(hbs`
        <Document::Sidebar::RelatedResources
          @productArea={{this.document.product}}
          @objectID={{this.document.objectID}}
          @headerTitle="Test title"
          @modalHeaderTitle="Add related resource"
          @modalInputPlaceholder="Paste a URL or search documents..."
          @scrollContainer={{this.body}}
        />
      `);

      await waitFor(LOADING_ICON_SELECTOR);
      assert.dom(LOADING_ICON_SELECTOR).exists("a loading icon is shown");

      await renderPromise;

      assert.dom(LIST_SELECTOR).exists("the list is shown");
      assert.dom(LIST_ITEM_SELECTOR).exists({ count: 4 }, "there are 4 items");

      assert
        .dom(HEADER_SELECTOR)
        .hasText("Test title", "the header title is correct");

      assert.dom(TOOLTIP_SELECTOR).doesNotExist();
      assert.dom(TOOLTIP_TRIGGER_SELECTOR).exists();
      await triggerEvent(TOOLTIP_TRIGGER_SELECTOR, "mouseenter");
      assert
        .dom(".hermes-tooltip")
        .hasText("Documents and links that are relevant to this work.");

      assert
        .dom(HERMES_DOCUMENT_SELECTOR)
        .exists({ count: 2 }, "there are 2 hermes documents");
      assert
        .dom(EXTERNAL_RESOURCE_SELECTOR)
        .exists({ count: 2 }, "there are 2 external resources");

      const listItemIDs = [
        ...document.querySelectorAll(LIST_ITEM_SELECTOR),
      ].map((item) => item.id);

      let expectedIds = [];

      for (let i = 1; i <= 4; i++) {
        expectedIds.push(`related-resource-${i}`);
      }

      assert.deepEqual(
        listItemIDs,
        expectedIds,
        "the list items have the correct IDs",
      );

      const hrefs = [
        ...document.querySelectorAll(`${LIST_ITEM_SELECTOR} a`),
      ].map((link) => link.getAttribute("href"));

      assert.deepEqual(hrefs, [
        "/document/1",
        "/document/2",
        "https://3.hashicorp.com",
        "https://4.hashicorp.com",
      ]);
    });

    test("it shows an error when related resources fail to load", async function (this: DocumentSidebarRelatedResourcesTestContext, assert) {
      this.server.get("/documents/:document_id/related-resources", () => {
        return new Response(500, {}, {});
      });

      await render<DocumentSidebarRelatedResourcesTestContext>(hbs`
        <Document::Sidebar::RelatedResources
          @productArea={{this.document.product}}
          @objectID={{this.document.objectID}}
          @headerTitle="Test title"
          @modalHeaderTitle="Add related resource"
          @modalInputPlaceholder="Paste a URL or search documents..."
          @scrollContainer={{this.body}}
        />
      `);

      assert
        .dom(LIST_SELECTOR)
        .doesNotExist("the list is not shown when loading fails");

      assert.dom(ERROR_MESSAGE_SELECTOR).hasText("Failed to load");
      assert.dom(ERROR_BUTTON_SELECTOR).hasText("Retry");
      this.server.get("/documents/:document_id/related-resources", () => {
        return new Response(200, {}, {});
      });

      await click(ERROR_BUTTON_SELECTOR);

      assert.dom(LIST_SELECTOR).exists("the list is shown again");
    });

    test("resources can be deleted (overflow menu)", async function (this: DocumentSidebarRelatedResourcesTestContext, assert) {
      this.server.create("relatedHermesDocument");
      this.server.create("relatedExternalLink");

      await render<DocumentSidebarRelatedResourcesTestContext>(hbs`
        <Document::Sidebar::RelatedResources
          @productArea={{this.document.product}}
          @objectID={{this.document.objectID}}
          @headerTitle="Test title"
          @modalHeaderTitle="Add related resource"
          @modalInputPlaceholder="Paste a URL or search documents..."
          @scrollContainer={{this.body}}
        />
      `);

      assert.dom(LIST_ITEM_SELECTOR).exists({ count: 2 });

      await click(OVERFLOW_BUTTON_SELECTOR);
      await click(REMOVE_BUTTON_SELECTOR);

      assert.dom(LIST_ITEM_SELECTOR).exists({ count: 1 });

      await click(OVERFLOW_BUTTON_SELECTOR);
      await click(REMOVE_BUTTON_SELECTOR);

      assert.dom(LIST_ITEM_SELECTOR).doesNotExist();
    });

    test("external resources can be deleted (modal)", async function (this: DocumentSidebarRelatedResourcesTestContext, assert) {
      this.server.create("relatedExternalLink", {
        name: "Example",
        url: "https://example.com",
      });

      await render<DocumentSidebarRelatedResourcesTestContext>(hbs`
        <Document::Sidebar::RelatedResources
          @productArea={{this.document.product}}
          @objectID={{this.document.objectID}}
          @headerTitle="Test title"
          @modalHeaderTitle="Test header"
          @modalInputPlaceholder="Paste a URL or search documents..."
          @scrollContainer={{this.body}}
        />
      `);

      assert.dom(LIST_ITEM_SELECTOR).exists({ count: 1 });

      await click(OVERFLOW_BUTTON_SELECTOR);
      await click(EDIT_BUTTON_SELECTOR);

      await waitFor(EDIT_MODAL_SELECTOR);

      await click(ADD_EXTERNAL_RESOURCE_MODAL_DELETE_BUTTON_SELECTOR);

      assert.dom(LIST_ITEM_SELECTOR).doesNotExist("the item is removed");
    });

    test("external resources can be edited", async function (this: DocumentSidebarRelatedResourcesTestContext, assert) {
      this.server.create("relatedExternalLink", {
        name: "Example",
        url: "https://example.com",
      });

      await render<DocumentSidebarRelatedResourcesTestContext>(hbs`
        <Document::Sidebar::RelatedResources
          @productArea={{this.document.product}}
          @objectID={{this.document.objectID}}
          @headerTitle="Test title"
          @modalHeaderTitle="Test header"
          @modalInputPlaceholder="Paste a URL or search documents..."
          @scrollContainer={{this.body}}
        />
      `);

      await click(OVERFLOW_BUTTON_SELECTOR);
      await click(EDIT_BUTTON_SELECTOR);

      await waitFor(EDIT_MODAL_SELECTOR);

      assert.dom(EDIT_MODAL_SELECTOR).exists("the edit modal is shown");
      assert.dom(EDIT_MODAL_HEADER_SELECTOR).hasText("Edit resource");

      assert.dom(EXTERNAL_RESOURCE_TITLE_INPUT_SELECTOR).hasValue("Example");
      assert
        .dom(EDIT_RESOURCE_URL_INPUT_SELECTOR)
        .hasValue("https://example.com");

      await fillIn(EXTERNAL_RESOURCE_TITLE_INPUT_SELECTOR, "New title");
      await fillIn(EDIT_RESOURCE_URL_INPUT_SELECTOR, "https://new-url.com");

      await click(EDIT_RESOURCE_SAVE_BUTTON_SELECTOR);

      assert.dom(EDIT_MODAL_SELECTOR).doesNotExist("the modal is closed");

      assert.dom(RESOURCE_TITLE_SELECTOR).hasText("New title");
      assert.dom(RESOURCE_SECONDARY_TEXT_SELECTOR).hasText("new-url.com");
      assert
        .dom(EXTERNAL_RESOURCE_SELECTOR + " a")
        .hasAttribute("href", "https://new-url.com");
    });

    test("you can add related hermes documents", async function (this: DocumentSidebarRelatedResourcesTestContext, assert) {
      this.server.db.emptyData();
      this.server.create("document", {
        objectID: "300",
      });

      await render<DocumentSidebarRelatedResourcesTestContext>(hbs`
        <Document::Sidebar::RelatedResources
          @productArea={{this.document.product}}
          @objectID={{this.document.objectID}}
          @headerTitle="Test title"
          @modalHeaderTitle="Add related resource"
          @modalInputPlaceholder="Paste a URL or search documents..."
          @scrollContainer={{this.body}}
        />
      `);

      assert.dom(LIST_ITEM_SELECTOR).doesNotExist("no items yet");

      await click(ADD_RESOURCE_BUTTON_SELECTOR);
      await waitFor(ADD_RELATED_RESOURCES_DOCUMENT_OPTION_SELECTOR);
      await click(ADD_RELATED_RESOURCES_DOCUMENT_OPTION_SELECTOR);

      await waitFor(LIST_ITEM_SELECTOR);

      assert
        .dom(LIST_ITEM_SELECTOR + " a")
        .exists()
        .hasAttribute("href", "/document/300");
    });

    test("you can add related external resources", async function (this: DocumentSidebarRelatedResourcesTestContext, assert) {
      await render<DocumentSidebarRelatedResourcesTestContext>(hbs`
        <Document::Sidebar::RelatedResources
          @productArea={{this.document.product}}
          @objectID={{this.document.objectID}}
          @headerTitle="Test title"
          @modalHeaderTitle="Add related resource"
          @modalInputPlaceholder="Test placeholder"
          @scrollContainer={{this.body}}
        />
      `);

      assert.dom(LIST_ITEM_SELECTOR).doesNotExist("no items yet");

      await click(ADD_RESOURCE_BUTTON_SELECTOR);
      await waitFor(ADD_RELATED_RESOURCES_DOCUMENT_OPTION_SELECTOR);
      await fillIn(
        ADD_RELATED_RESOURCES_SEARCH_INPUT_SELECTOR,
        "https://example.com",
      );

      await fillIn(EXTERNAL_RESOURCE_TITLE_INPUT_SELECTOR, "Example");
      await click(ADD_EXTERNAL_RESOURCE_SUBMIT_BUTTON_SELECTOR);

      await waitFor(LIST_ITEM_SELECTOR);

      assert
        .dom(LIST_ITEM_SELECTOR + " a")
        .hasAttribute("href", "https://example.com");
    });

    test("you can set an item limit", async function (this: DocumentSidebarRelatedResourcesTestContext, assert) {
      this.server.create("relatedHermesDocument", {
        id: 1,
      });

      this.server.create("relatedHermesDocument", {
        id: 2,
      });

      await render<DocumentSidebarRelatedResourcesTestContext>(hbs`
        <Document::Sidebar::RelatedResources
          @productArea={{this.document.product}}
          @objectID={{this.document.objectID}}
          @itemLimit={{1}}
          @headerTitle="Test title"
          @modalHeaderTitle="Add related resource"
          @modalInputPlaceholder="Test placeholder"
          @scrollContainer={{this.body}}
        />
      `);

      assert
        .dom(LIST_ITEM_SELECTOR)
        .exists({ count: 1 }, "items are limited by the 'itemLimit' argument");

      assert
        .dom(ADD_RESOURCE_BUTTON_SELECTOR)
        .doesNotExist("the add button is removed when the limit is reached");
    });

    test("it calls the correct endpoint when editing a draft", async function (this: DocumentSidebarRelatedResourcesTestContext, assert) {
      this.server.create("relatedExternalLink", {
        name: "Example",
        url: "https://example.com",
      });

      await render<DocumentSidebarRelatedResourcesTestContext>(hbs`
        <Document::Sidebar::RelatedResources
          @productArea={{this.document.product}}
          @objectID={{this.document.objectID}}
          @documentIsDraft={{true}}
          @headerTitle="Test title"
          @modalHeaderTitle="Test header"
          @modalInputPlaceholder="Paste a URL or search documents..."
          @scrollContainer={{this.body}}
        />
      `);

      assert
        .dom(LIST_ITEM_SELECTOR)
        .exists({ count: 1 }, "it loaded resources from the drafts endpoint");

      await click(OVERFLOW_BUTTON_SELECTOR);

      await click(REMOVE_BUTTON_SELECTOR);

      assert
        .dom(LIST_ITEM_SELECTOR)
        .doesNotExist("the PUT call went to the drafts endpoint");
    });

    todo(
      "it temporarily adds a highlight affordance to new and recently edited docs",
      async function (
        this: DocumentSidebarRelatedResourcesTestContext,
        assert,
      ) {
        // Intentionally make it fail for `todo` purposes
        assert.true(false);

        this.server.create("relatedHermesDocument", {
          id: 1,
        });

        this.server.create("relatedHermesDocument", {
          id: 2,
        });

        this.server.create("relatedExternalLink", {
          id: 3,
        });

        this.server.createList("document", 2);

        await render<DocumentSidebarRelatedResourcesTestContext>(hbs`
        <Document::Sidebar::RelatedResources
          @productArea={{this.document.product}}
          @objectID={{this.document.objectID}}
          @documentIsDraft={{true}}
          @headerTitle="Test title"
          @modalHeaderTitle="Test header"
          @modalInputPlaceholder="Paste a URL or search documents..."
          @scrollContainer={{this.body}}
        />
      `);

        assert.dom(LIST_ITEM_SELECTOR).exists({ count: 3 });

        // Add a new document
        await click(ADD_RESOURCE_BUTTON_SELECTOR);
        await waitFor(ADD_RELATED_RESOURCES_DOCUMENT_OPTION_SELECTOR);
        await click(ADD_RELATED_RESOURCES_DOCUMENT_OPTION_SELECTOR);

        assert.dom(LIST_ITEM_SELECTOR).exists({ count: 4 });

        await waitFor(".highlight-affordance");

        // A new document will be the first item
        assert.dom(LIST_ITEM_SELECTOR + " .highlight-affordance").exists();

        // Confirm that the highlight-affordance div is removed
        await waitUntil(() => {
          return !find(".highlight-affordance");
        });

        // Add a new external resource
        await click(ADD_RESOURCE_BUTTON_SELECTOR);
        await fillIn(
          ADD_RELATED_RESOURCES_SEARCH_INPUT_SELECTOR,
          "https://new-resource-example.com",
        );
        await fillIn(EXTERNAL_RESOURCE_TITLE_INPUT_SELECTOR, "New resource");
        await click(ADD_EXTERNAL_RESOURCE_SUBMIT_BUTTON_SELECTOR);

        assert.dom(LIST_ITEM_SELECTOR).exists({ count: 5 });

        await waitFor(".highlight-affordance");

        assert
          // A new external resource will render after the 3 documents.
          .dom(LIST_ITEM_SELECTOR + ":nth-child(4) .highlight-affordance")
          .exists();

        // Confirm that the highlight-affordance div is removed
        // Because we target it in the next step
        await waitUntil(() => {
          return !find(".highlight-affordance");
        });

        // Edit a document
        await click(
          LIST_ITEM_SELECTOR + ":nth-child(4) " + OVERFLOW_BUTTON_SELECTOR,
        );
        await click(EDIT_BUTTON_SELECTOR);

        await click(EDIT_RESOURCE_SAVE_BUTTON_SELECTOR);

        await waitFor(".highlight-affordance");

        assert
          .dom(LIST_ITEM_SELECTOR + ":nth-child(4) .highlight-affordance")
          .exists();
      },
    );

    test("a title is required when editing a resource", async function (this: DocumentSidebarRelatedResourcesTestContext, assert) {
      this.server.create("relatedExternalLink", {
        name: "Example",
        url: "https://example.com",
      });

      await render<DocumentSidebarRelatedResourcesTestContext>(hbs`
        <Document::Sidebar::RelatedResources
          @productArea={{this.document.product}}
          @objectID={{this.document.objectID}}
          @documentIsDraft={{true}}
          @headerTitle="Test title"
          @modalHeaderTitle="Test header"
          @modalInputPlaceholder="Paste a URL or search documents..."
          @scrollContainer={{this.body}}
        />
      `);

      await click(OVERFLOW_BUTTON_SELECTOR);
      await click(EDIT_BUTTON_SELECTOR);

      await fillIn(EXTERNAL_RESOURCE_TITLE_INPUT_SELECTOR, "");
      await click(EDIT_RESOURCE_SAVE_BUTTON_SELECTOR);

      assert
        .dom(EDIT_EXTERNAL_RESOURCE_ERROR_SELECTOR)
        .hasText("A title is required.");
    });
  },
);
