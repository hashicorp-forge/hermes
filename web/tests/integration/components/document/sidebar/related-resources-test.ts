import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import {
  click,
  fillIn,
  find,
  render,
  waitFor,
  waitUntil,
} from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { HermesDocument } from "hermes/types/document";
import { Response } from "miragejs";
import config from "hermes/config/environment";

const LOADING_ICON_SELECTOR = "[data-test-related-resources-list-loading-icon]";
const LIST_SELECTOR = "[data-test-related-resources-list]";
const LIST_ITEM_SELECTOR = ".related-resource";
const HERMES_DOCUMENT_SELECTOR = ".hermes-document";
const EXTERNAL_RESOURCE_SELECTOR = ".external-resource";
const BADGE_SELECTOR = "[data-test-sidebar-section-header-badge]";
const HEADER_SELECTOR = ".sidebar-section-header";
const ERROR_MESSAGE_SELECTOR = ".related-resources-failed-to-load";
const ERROR_BUTTON_SELECTOR = "[data-test-related-resources-error-button]";
const OVERFLOW_BUTTON_SELECTOR = ".related-resource-overflow-button";
const EDIT_BUTTON_SELECTOR = "[data-test-overflow-menu-action='edit']";
const REMOVE_BUTTON_SELECTOR = "[data-test-overflow-menu-action='remove']";
const EDIT_MODAL_SELECTOR = "[data-test-edit-related-resource-modal]";
const EDIT_MODAL_HEADER_SELECTOR =
  "[data-test-edit-related-resource-modal-header]";
const EXTERNAL_RESOURCE_TITLE_INPUT_SELECTOR = ".external-resource-title-input";
const EDIT_RESOURCE_URL_INPUT_SELECTOR =
  "[data-test-external-resource-url-input]";
const EDIT_RESOURCE_SAVE_BUTTON_SELECTOR =
  "[data-test-edit-related-resource-modal-save-button]";
const ADD_RESOURCE_BUTTON_SELECTOR = ".sidebar-section-header-button";
const ADD_RESOURCE_MODAL_SELECTOR = "[data-test-add-related-resource-modal]";
const ADD_RELATED_RESOURCES_LIST_SELECTOR =
  "[data-test-add-related-resources-list]";
const ADD_RELATED_RESOURCES_DOCUMENT_OPTION_SELECTOR =
  ".related-document-option";
const ADD_RELATED_RESOURCES_SEARCH_INPUT_SELECTOR =
  "[data-test-related-resources-search-input]";
const NO_RESOURCES_FOUND_SELECTOR = "[data-test-no-related-resources-found]";
const ADD_EXTERNAL_RESOURCE_FORM_SELECTOR =
  "[data-test-add-external-resource-form]";
const ADD_EXTERNAL_RESOURCE_SUBMIT_BUTTON_SELECTOR =
  "[data-test-add-external-resource-submit-button]";
const ADD_EXTERNAL_RESOURCE_MODAL_DELETE_BUTTON_SELECTOR =
  "[data-test-edit-related-resource-modal-delete-button]";
const ADD_EXTERNAL_RESOURCE_ERROR_SELECTOR =
  "[data-test-add-external-resource-error]";

interface DocumentSidebarRelatedResourcesTestContext extends MirageTestContext {
  document: HermesDocument;
}

module(
  "Integration | Component | document/sidebar/related-resources",
  function (hooks) {
    setupRenderingTest(hooks);
    setupMirage(hooks);

    hooks.beforeEach(function (
      this: DocumentSidebarRelatedResourcesTestContext
    ) {
      this.server.create("document", {
        product: "Labs",
        objectID: "1234",
      });

      this.set("document", this.server.schema.document.first().attrs);
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
          @allowAddingExternalLinks={{true}}
          @headerTitle="Test title"
          @modalHeaderTitle="Add related resource"
          @modalInputPlaceholder="Paste a URL or search documents..."
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

      assert.dom(BADGE_SELECTOR).hasText("New", "the 'new' badge is rendered'");

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
        "the list items have the correct IDs"
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

    test("it shows an error message when the related resources fail to load", async function (this: DocumentSidebarRelatedResourcesTestContext, assert) {
      this.server.get("/documents/:document_id/related-resources", () => {
        return new Response(500, {}, {});
      });

      await render<DocumentSidebarRelatedResourcesTestContext>(hbs`
        <Document::Sidebar::RelatedResources
          @productArea={{this.document.product}}
          @objectID={{this.document.objectID}}
          @allowAddingExternalLinks={{true}}
          @headerTitle="Test title"
          @modalHeaderTitle="Add related resource"
          @modalInputPlaceholder="Paste a URL or search documents..."
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
          @allowAddingExternalLinks={{true}}
          @headerTitle="Test title"
          @modalHeaderTitle="Add related resource"
          @modalInputPlaceholder="Paste a URL or search documents..."
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
          @allowAddingExternalLinks={{true}}
          @headerTitle="Test title"
          @modalHeaderTitle="Test header"
          @modalInputPlaceholder="Paste a URL or search documents..."
        />
      `);

      assert.dom(LIST_ITEM_SELECTOR).exists({ count: 1 });

      await click(OVERFLOW_BUTTON_SELECTOR);
      await click(EDIT_BUTTON_SELECTOR);

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
          @allowAddingExternalLinks={{true}}
          @headerTitle="Test title"
          @modalHeaderTitle="Test header"
          @modalInputPlaceholder="Paste a URL or search documents..."
        />
      `);

      await click(OVERFLOW_BUTTON_SELECTOR);
      await click(EDIT_BUTTON_SELECTOR);

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

      assert.dom(EXTERNAL_RESOURCE_SELECTOR).hasText("New title");
      assert
        .dom(EXTERNAL_RESOURCE_SELECTOR + " a")
        .hasAttribute("href", "https://new-url.com");
    });

    test("you can add related hermes documents", async function (this: DocumentSidebarRelatedResourcesTestContext, assert) {
      this.server.createList("document", 3);

      await render<DocumentSidebarRelatedResourcesTestContext>(hbs`
        <Document::Sidebar::RelatedResources
          @productArea={{this.document.product}}
          @objectID={{this.document.objectID}}
          @allowAddingExternalLinks={{true}}
          @headerTitle="Test title"
          @modalHeaderTitle="Add related resource"
          @modalInputPlaceholder="Paste a URL or search documents..."
        />
      `);

      assert.dom(LIST_ITEM_SELECTOR).doesNotExist("no items yet");

      await click(ADD_RESOURCE_BUTTON_SELECTOR);

      assert.dom(ADD_RESOURCE_MODAL_SELECTOR).exists("the modal is shown");
      assert
        .dom(ADD_RELATED_RESOURCES_LIST_SELECTOR)
        .exists("the list is shown");

      await waitFor(ADD_RELATED_RESOURCES_DOCUMENT_OPTION_SELECTOR);

      assert.dom(ADD_RELATED_RESOURCES_DOCUMENT_OPTION_SELECTOR).exists({
        count: 4,
      });

      await click(ADD_RELATED_RESOURCES_DOCUMENT_OPTION_SELECTOR);

      assert
        .dom(ADD_RESOURCE_MODAL_SELECTOR)
        .doesNotExist("the modal is closed");

      assert.dom(LIST_ITEM_SELECTOR).exists({ count: 1 }, "there is 1 item");
    });

    test("it shows a 'no results' fallback message", async function (this: DocumentSidebarRelatedResourcesTestContext, assert) {
      await render<DocumentSidebarRelatedResourcesTestContext>(hbs`
        <Document::Sidebar::RelatedResources
          @productArea={{this.document.product}}
          @objectID={{this.document.objectID}}
          @allowAddingExternalLinks={{true}}
          @headerTitle="Test title"
          @modalHeaderTitle="Add related resource"
          @modalInputPlaceholder="Paste a URL or search documents..."
        />
      `);

      await click(ADD_RESOURCE_BUTTON_SELECTOR);

      await waitFor(ADD_RELATED_RESOURCES_DOCUMENT_OPTION_SELECTOR);

      assert.dom(ADD_RELATED_RESOURCES_DOCUMENT_OPTION_SELECTOR).exists({
        count: 1,
      });

      await fillIn(ADD_RELATED_RESOURCES_SEARCH_INPUT_SELECTOR, "XYZ");

      await waitFor(NO_RESOURCES_FOUND_SELECTOR);

      assert.dom(NO_RESOURCES_FOUND_SELECTOR).exists();
    });

    test("you can add related external resources", async function (this: DocumentSidebarRelatedResourcesTestContext, assert) {
      await render<DocumentSidebarRelatedResourcesTestContext>(hbs`
        <Document::Sidebar::RelatedResources
          @productArea={{this.document.product}}
          @objectID={{this.document.objectID}}
          @allowAddingExternalLinks={{true}}
          @headerTitle="Test title"
          @modalHeaderTitle="Add related resource"
          @modalInputPlaceholder="Test placeholder"
        />
      `);

      assert.dom(LIST_ITEM_SELECTOR).doesNotExist("no items yet");

      // Add a resource without a title

      await click(ADD_RESOURCE_BUTTON_SELECTOR);

      await waitFor(ADD_RELATED_RESOURCES_DOCUMENT_OPTION_SELECTOR);

      assert
        .dom(ADD_RELATED_RESOURCES_DOCUMENT_OPTION_SELECTOR)
        .exists({ count: 1 }, "documents are listed in a modal");

      await fillIn(
        ADD_RELATED_RESOURCES_SEARCH_INPUT_SELECTOR,
        "https://example.com"
      );

      assert
        .dom(ADD_RELATED_RESOURCES_DOCUMENT_OPTION_SELECTOR)
        .doesNotExist("documents are removed when a valid URL is entered");
      assert
        .dom(ADD_EXTERNAL_RESOURCE_FORM_SELECTOR)
        .exists('the "add resource" form is shown');
      assert
        .dom(EXTERNAL_RESOURCE_TITLE_INPUT_SELECTOR)
        .hasAttribute("placeholder", "Optional");

      await click(ADD_EXTERNAL_RESOURCE_SUBMIT_BUTTON_SELECTOR);

      assert
        .dom(ADD_RESOURCE_MODAL_SELECTOR)
        .doesNotExist("the modal is closed");

      assert
        .dom(LIST_ITEM_SELECTOR)
        .exists({ count: 1 }, "there is 1 item")
        .hasText(
          "https://example.com",
          "the external resource displays a URL when no title is provided"
        );

      // Add a resource with a title

      await click(ADD_RESOURCE_BUTTON_SELECTOR);

      assert
        .dom(ADD_RELATED_RESOURCES_DOCUMENT_OPTION_SELECTOR)
        .exists("documents are shown again when the modal is reopened");

      assert
        .dom(ADD_RELATED_RESOURCES_SEARCH_INPUT_SELECTOR)
        .hasValue("", "the form is reset")
        .hasAttribute(
          "placeholder",
          "Test placeholder",
          "the custom placeholder is shown"
        );

      await fillIn(
        ADD_RELATED_RESOURCES_SEARCH_INPUT_SELECTOR,
        "https://hashicorp.com"
      );

      await fillIn(EXTERNAL_RESOURCE_TITLE_INPUT_SELECTOR, "HashiCorp");

      await click(ADD_EXTERNAL_RESOURCE_SUBMIT_BUTTON_SELECTOR);

      assert
        .dom(ADD_RESOURCE_MODAL_SELECTOR)
        .doesNotExist("the modal is closed");

      assert.dom(LIST_ITEM_SELECTOR).exists({ count: 2 }, "there are 2 items");

      assert
        .dom(LIST_ITEM_SELECTOR + ":first-child")
        .hasText(
          "HashiCorp",
          "the external resource displays a title when provided"
        );
    });

    test("it prevents duplicate external resources", async function (this: DocumentSidebarRelatedResourcesTestContext, assert) {
      const url = "https://example.com";

      this.server.create("relatedExternalLink", {
        url,
      });

      await render<DocumentSidebarRelatedResourcesTestContext>(hbs`
        <Document::Sidebar::RelatedResources
          @productArea={{this.document.product}}
          @objectID={{this.document.objectID}}
          @allowAddingExternalLinks={{true}}
          @headerTitle="Test title"
          @modalHeaderTitle="Add related resource"
          @modalInputPlaceholder="Test placeholder"
        />
      `);

      await click(ADD_RESOURCE_BUTTON_SELECTOR);

      await fillIn(ADD_RELATED_RESOURCES_SEARCH_INPUT_SELECTOR, url);

      assert
        .dom(ADD_EXTERNAL_RESOURCE_ERROR_SELECTOR)
        .hasText("This resource has already been added.");

      await click(ADD_EXTERNAL_RESOURCE_SUBMIT_BUTTON_SELECTOR);

      assert
        .dom(ADD_RESOURCE_MODAL_SELECTOR)
        .exists("the button is disabled when the URL is a duplicate");

      await fillIn(ADD_RELATED_RESOURCES_SEARCH_INPUT_SELECTOR, "https://");

      assert
        .dom(ADD_EXTERNAL_RESOURCE_ERROR_SELECTOR)
        .doesNotExist("the error message is removed when the URL changes");
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
          @allowAddingExternalLinks={{true}}
          @headerTitle="Test title"
          @modalHeaderTitle="Add related resource"
          @modalInputPlaceholder="Test placeholder"
        />
      `);

      assert
        .dom(LIST_ITEM_SELECTOR)
        .exists({ count: 1 }, "items are limited by the 'itemLimit' argument");

      assert
        .dom(ADD_RESOURCE_BUTTON_SELECTOR)
        .doesNotExist("the add button is removed when the limit is reached");
    });

    test("you can turn off the external link fallback", async function (this: DocumentSidebarRelatedResourcesTestContext, assert) {
      await render<DocumentSidebarRelatedResourcesTestContext>(hbs`
        <Document::Sidebar::RelatedResources
          @productArea={{this.document.product}}
          @objectID={{this.document.objectID}}
          @allowAddingExternalLinks={{false}}
          @headerTitle="Test title"
          @modalHeaderTitle="Add related resource"
          @modalInputPlaceholder="Test placeholder"
        />
      `);

      await click(ADD_RESOURCE_BUTTON_SELECTOR);

      await fillIn(
        ADD_RELATED_RESOURCES_SEARCH_INPUT_SELECTOR,
        "https://example.com"
      );

      assert
        .dom(ADD_EXTERNAL_RESOURCE_FORM_SELECTOR)
        .doesNotExist("the external resource form is not shown");

      assert
        .dom(NO_RESOURCES_FOUND_SELECTOR)
        .exists("the fallback message is shown");
    });

    test("it shows an error when searching fails", async function (this: DocumentSidebarRelatedResourcesTestContext, assert) {
      this.server.createList("document", 3);

      this.server.post(
        `https://${config.algolia.appID}-dsn.algolia.net/1/indexes/**`,
        () => {
          return new Response(500, {}, {});
        }
      );

      let algoliaSearchHosts = [];

      for (let i = 1; i <= 9; i++) {
        algoliaSearchHosts.push(
          `https://${config.algolia.appID}-${i}.algolianet.com/1/indexes/**`
        );
      }

      algoliaSearchHosts.forEach((host) => {
        this.server.post(host, () => {
          return new Response(500, {}, {});
        });
      });

      await render<DocumentSidebarRelatedResourcesTestContext>(hbs`
          <Document::Sidebar::RelatedResources
            @productArea={{this.document.product}}
            @objectID={{this.document.objectID}}
            @allowAddingExternalLinks={{true}}
            @headerTitle="Test title"
            @modalHeaderTitle="Add related resource"
            @modalInputPlaceholder="Test placeholder"
          />
        `);

      await click(ADD_RESOURCE_BUTTON_SELECTOR);

      await waitFor(NO_RESOURCES_FOUND_SELECTOR);

      assert
        .dom(NO_RESOURCES_FOUND_SELECTOR)
        .containsText(
          "Search error. Type to retry.",
          "the error message is shown in the modal"
        );
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
          @allowAddingExternalLinks={{true}}
          @headerTitle="Test title"
          @modalHeaderTitle="Test header"
          @modalInputPlaceholder="Paste a URL or search documents..."
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

    test("it temporarily adds a highlight affordance to new and recently edited docs", async function (this: DocumentSidebarRelatedResourcesTestContext, assert) {
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
          @allowAddingExternalLinks={{true}}
          @headerTitle="Test title"
          @modalHeaderTitle="Test header"
          @modalInputPlaceholder="Paste a URL or search documents..."
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
        "https://new-resource-example.com"
      );
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
        LIST_ITEM_SELECTOR + ":nth-child(4) " + OVERFLOW_BUTTON_SELECTOR
      );
      await click(EDIT_BUTTON_SELECTOR);
      await click(EDIT_RESOURCE_SAVE_BUTTON_SELECTOR);

      await waitFor(".highlight-affordance");

      assert
        .dom(LIST_ITEM_SELECTOR + ":nth-child(4) .highlight-affordance")
        .exists();
    });
  }
);
