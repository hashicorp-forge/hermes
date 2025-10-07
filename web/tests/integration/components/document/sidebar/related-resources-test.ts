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
import {
  RELATED_RESOURCES_LIST_LOADING_ICON,
  RELATED_RESOURCES_LIST,
  RELATED_RESOURCES_LIST_ITEM,
  HERMES_DOCUMENT,
  EXTERNAL_RESOURCE,
  SIDEBAR_SECTION_HEADER,
  RELATED_RESOURCES_ERROR_BUTTON,
  OVERFLOW_BUTTON,
  OVERFLOW_MENU_EDIT_ACTION,
  OVERFLOW_MENU_REMOVE_ACTION,
  ADD_OR_EDIT_EXTERNAL_RESOURCE_MODAL,
  MODAL_HEADER,
  SAVE_BUTTON,
  DELETE_BUTTON,
  EXTERNAL_RESOURCE_TITLE_INPUT,
  EXTERNAL_RESOURCE_URL_INPUT,
  SIDEBAR_SECTION_HEADER_BUTTON,
  ADD_RESOURCE_MODAL,
  RELATED_DOCUMENT_OPTION,
  EXTERNAL_RESOURCE_TITLE_ERROR,
  RESOURCE_TITLE,
  RESOURCE_SECONDARY_TEXT,
  TOOLTIP_ICON_TRIGGER,
  TOOLTIP,
  ADD_FALLBACK_EXTERNAL_RESOURCE,
  SUBMIT_BUTTON,
  RELATED_RESOURCES_LIST_EMPTY_STATE,
} from "hermes/tests/helpers/selectors";

// Local selectors not yet in shared file
const ERROR_MESSAGE_SELECTOR = ".failed-to-load-text";
const ADD_RELATED_RESOURCES_SEARCH_INPUT_SELECTOR =
  "[data-test-related-resources-search-input]";

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

      assert.dom(ADD_RESOURCE_MODAL).exists();
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

      await waitFor(RELATED_RESOURCES_LIST_LOADING_ICON);
      assert.dom(RELATED_RESOURCES_LIST_LOADING_ICON).exists("a loading icon is shown");

      await renderPromise;

      assert.dom(RELATED_RESOURCES_LIST).exists("the list is shown");
      assert.dom(RELATED_RESOURCES_LIST_ITEM).exists({ count: 4 }, "there are 4 items");

      assert
        .dom(SIDEBAR_SECTION_HEADER)
        .hasText("Test title", "the header title is correct");

      assert.dom(TOOLTIP).doesNotExist();
      assert.dom(TOOLTIP_ICON_TRIGGER).exists();
      await triggerEvent(TOOLTIP_ICON_TRIGGER, "mouseenter");
      assert
        .dom(".hermes-tooltip")
        .hasText("Documents and links that are relevant to this work.");

      assert
        .dom(HERMES_DOCUMENT)
        .exists({ count: 2 }, "there are 2 hermes documents");
      assert
        .dom(EXTERNAL_RESOURCE)
        .exists({ count: 2 }, "there are 2 external resources");

      const listItemIDs = [
        ...document.querySelectorAll(RELATED_RESOURCES_LIST_ITEM),
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
        ...document.querySelectorAll(`${RELATED_RESOURCES_LIST_ITEM} a`),
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
        .dom(RELATED_RESOURCES_LIST)
        .doesNotExist("the list is not shown when loading fails");

      assert.dom(ERROR_MESSAGE_SELECTOR).hasText("Failed to load");
      assert.dom(RELATED_RESOURCES_ERROR_BUTTON).hasText("Retry");
      this.server.get("/documents/:document_id/related-resources", () => {
        return new Response(200, {}, {});
      });

      await click(RELATED_RESOURCES_ERROR_BUTTON);

      assert.dom(RELATED_RESOURCES_LIST).exists("the list is shown again");
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

      assert.dom(RELATED_RESOURCES_LIST_ITEM).exists({ count: 2 });

      await click(OVERFLOW_BUTTON);
      await click(OVERFLOW_MENU_REMOVE_ACTION);

      assert.dom(RELATED_RESOURCES_LIST_ITEM).exists({ count: 1 });

      await click(OVERFLOW_BUTTON);
      await click(OVERFLOW_MENU_REMOVE_ACTION);

      assert.dom(RELATED_RESOURCES_LIST_ITEM).doesNotExist();
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

      assert.dom(RELATED_RESOURCES_LIST_ITEM).exists({ count: 1 });

      await click(OVERFLOW_BUTTON);
      await click(OVERFLOW_MENU_EDIT_ACTION);

      await waitFor(ADD_OR_EDIT_EXTERNAL_RESOURCE_MODAL);

      await click(`${ADD_OR_EDIT_EXTERNAL_RESOURCE_MODAL} ${DELETE_BUTTON}`);

      assert.dom(RELATED_RESOURCES_LIST_ITEM).doesNotExist("the item is removed");
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

      await click(OVERFLOW_BUTTON);
      await click(OVERFLOW_MENU_EDIT_ACTION);

      await waitFor(ADD_OR_EDIT_EXTERNAL_RESOURCE_MODAL);

      assert.dom(ADD_OR_EDIT_EXTERNAL_RESOURCE_MODAL).exists("the edit modal is shown");
      assert.dom(`${ADD_OR_EDIT_EXTERNAL_RESOURCE_MODAL} ${MODAL_HEADER}`).hasText("Edit resource");

      assert.dom(EXTERNAL_RESOURCE_TITLE_INPUT).hasValue("Example");
      assert
        .dom(EXTERNAL_RESOURCE_URL_INPUT)
        .hasValue("https://example.com");

      await fillIn(EXTERNAL_RESOURCE_TITLE_INPUT, "New title");
      await fillIn(EXTERNAL_RESOURCE_URL_INPUT, "https://new-url.com");

      await click(`${ADD_OR_EDIT_EXTERNAL_RESOURCE_MODAL} ${SAVE_BUTTON}`);

      assert.dom(ADD_OR_EDIT_EXTERNAL_RESOURCE_MODAL).doesNotExist("the modal is closed");

      assert.dom(RESOURCE_TITLE).hasText("New title");
      assert.dom(RESOURCE_SECONDARY_TEXT).hasText("new-url.com");
      assert
        .dom(EXTERNAL_RESOURCE + " a")
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

      assert.dom(RELATED_RESOURCES_LIST_ITEM).doesNotExist("no items yet");

      await click(SIDEBAR_SECTION_HEADER_BUTTON);
      await waitFor(RELATED_DOCUMENT_OPTION);
      await click(RELATED_DOCUMENT_OPTION);

      await waitFor(RELATED_RESOURCES_LIST_ITEM);

      assert
        .dom(RELATED_RESOURCES_LIST_ITEM + " a")
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

      assert.dom(RELATED_RESOURCES_LIST_ITEM).doesNotExist("no items yet");

      await click(SIDEBAR_SECTION_HEADER_BUTTON);
      await waitFor(RELATED_DOCUMENT_OPTION);
      await fillIn(
        ADD_RELATED_RESOURCES_SEARCH_INPUT_SELECTOR,
        "https://example.com",
      );

      await fillIn(EXTERNAL_RESOURCE_TITLE_INPUT, "Example");
      await click(`${ADD_FALLBACK_EXTERNAL_RESOURCE} ${SUBMIT_BUTTON}`);

      await waitFor(RELATED_RESOURCES_LIST_ITEM);

      assert
        .dom(RELATED_RESOURCES_LIST_ITEM + " a")
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
        .dom(RELATED_RESOURCES_LIST_ITEM)
        .exists({ count: 1 }, "items are limited by the 'itemLimit' argument");

      assert
        .dom(SIDEBAR_SECTION_HEADER_BUTTON)
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
        .dom(RELATED_RESOURCES_LIST_ITEM)
        .exists({ count: 1 }, "it loaded resources from the drafts endpoint");

      await click(OVERFLOW_BUTTON);

      await click(OVERFLOW_MENU_REMOVE_ACTION);

      assert
        .dom(RELATED_RESOURCES_LIST_ITEM)
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

        assert.dom(RELATED_RESOURCES_LIST_ITEM).exists({ count: 3 });

        // Add a new document
        await click(SIDEBAR_SECTION_HEADER_BUTTON);
        await waitFor(RELATED_DOCUMENT_OPTION);
        await click(RELATED_DOCUMENT_OPTION);

        assert.dom(RELATED_RESOURCES_LIST_ITEM).exists({ count: 4 });

        await waitFor(".highlight-affordance");

        // A new document will be the first item
        assert.dom(RELATED_RESOURCES_LIST_ITEM + " .highlight-affordance").exists();

        // Confirm that the highlight-affordance div is removed
        await waitUntil(() => {
          return !find(".highlight-affordance");
        });

        // Add a new external resource
        await click(SIDEBAR_SECTION_HEADER_BUTTON);
        await fillIn(
          ADD_RELATED_RESOURCES_SEARCH_INPUT_SELECTOR,
          "https://new-resource-example.com",
        );
        await fillIn(EXTERNAL_RESOURCE_TITLE_INPUT, "New resource");
        await click(`${ADD_FALLBACK_EXTERNAL_RESOURCE} ${SUBMIT_BUTTON}`);

        assert.dom(RELATED_RESOURCES_LIST_ITEM).exists({ count: 5 });

        await waitFor(".highlight-affordance");

        assert
          // A new external resource will render after the 3 documents.
          .dom(RELATED_RESOURCES_LIST_ITEM + ":nth-child(4) .highlight-affordance")
          .exists();

        // Confirm that the highlight-affordance div is removed
        // Because we target it in the next step
        await waitUntil(() => {
          return !find(".highlight-affordance");
        });

        // Edit a document
        await click(
          RELATED_RESOURCES_LIST_ITEM + ":nth-child(4) " + OVERFLOW_BUTTON,
        );
        await click(OVERFLOW_MENU_EDIT_ACTION);

        await click(`${ADD_OR_EDIT_EXTERNAL_RESOURCE_MODAL} ${SAVE_BUTTON}`);

        await waitFor(".highlight-affordance");

        assert
          .dom(RELATED_RESOURCES_LIST_ITEM + ":nth-child(4) .highlight-affordance")
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

      await click(OVERFLOW_BUTTON);
      await click(OVERFLOW_MENU_EDIT_ACTION);

      await fillIn(EXTERNAL_RESOURCE_TITLE_INPUT, "");
      await click(`${ADD_OR_EDIT_EXTERNAL_RESOURCE_MODAL} ${SAVE_BUTTON}`);

      assert
        .dom(EXTERNAL_RESOURCE_TITLE_ERROR)
        .hasText("A title is required.");
    });
  },
);
