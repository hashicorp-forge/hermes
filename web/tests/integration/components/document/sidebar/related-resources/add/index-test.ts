import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { TestContext, fillIn, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { HermesDocument } from "hermes/types/document";
import { assert } from "@ember/debug";

const MODAL_TITLE_SELECTOR = "[data-test-add-related-resource-modal-title]";
const SEARCH_INPUT_SELECTOR = "[data-test-related-resources-search-input]";
const LIST_HEADER_SELECTOR = "[data-test-related-resources-list-header]";
const DOCUMENT_OPTION_SELECTOR = ".related-document-option";

interface DocumentSidebarRelatedResourcesAddTestContext
  extends MirageTestContext {
  noop: () => void;
  search: (dd: any, query: string) => Promise<void>;
  shownDocuments: Record<string, HermesDocument>;
  testArray: any[];
}

module(
  "Integration | Component | document/sidebar/related-resources/add",
  function (hooks) {
    setupRenderingTest(hooks);
    setupMirage(hooks);

    hooks.beforeEach(function (
      this: DocumentSidebarRelatedResourcesAddTestContext
    ) {
      this.server.createList("document", 10);
      this.set("testArray", []);
      this.set("noop", () => {});

      let suggestions = this.server.schema.document.all().models;

      const reducerFunction = (
        acc: Record<string, HermesDocument>,
        document: { attrs: HermesDocument }
      ) => {
        acc[document.attrs.objectID] = document.attrs;
        return acc;
      };

      suggestions = suggestions.reduce(reducerFunction, {});

      const getFirstFourRecords = (documents: any) => {
        return Object.keys(documents)
          .slice(0, 4)
          .reduce((acc, key) => {
            acc[key] = documents[key];
            return acc;
          }, {} as Record<string, HermesDocument>);
      };

      suggestions = getFirstFourRecords(suggestions);

      this.set("shownDocuments", suggestions);

      this.set("search", (dd: any, query: string) => {
        if (query === "") {
          this.set("shownDocuments", suggestions);
        } else {
          let matches = this.server.schema.document
            .where((document: HermesDocument) => {
              return document.title.toLowerCase().includes(query.toLowerCase());
            })
            .models.reduce(reducerFunction, {});
          this.set("shownDocuments", getFirstFourRecords(matches));
        }
        return Promise.resolve();
      });
    });

    test("it renders correctly (initial load)", async function (this: DocumentSidebarRelatedResourcesAddTestContext, assert) {
      await render<DocumentSidebarRelatedResourcesAddTestContext>(hbs`
        <Document::Sidebar::RelatedResources::Add
          @headerTitle="Test title"
          @inputPlaceholder="Test placeholder"
          @onClose={{this.noop}}
          @addRelatedExternalLink={{this.noop}}
          @addRelatedDocument={{this.noop}}
          @shownDocuments={{this.shownDocuments}}
          @objectID="test"
          @relatedDocuments={{this.testArray}}
          @relatedLinks={{this.testArray}}
          @search={{this.search}}
        />
      `);

      assert.dom(MODAL_TITLE_SELECTOR).hasText("Test title");
      assert.dom(LIST_HEADER_SELECTOR).hasText("Suggestions");
      assert.dom(DOCUMENT_OPTION_SELECTOR).exists({ count: 4 });
      assert
        .dom(SEARCH_INPUT_SELECTOR)
        .hasAttribute("placeholder", "Test placeholder");
    });

    test("it conditionally renders a list header", async function (this: DocumentSidebarRelatedResourcesAddTestContext, assert) {
      await render<DocumentSidebarRelatedResourcesAddTestContext>(hbs`
        <Document::Sidebar::RelatedResources::Add
          @headerTitle="Test title"
          @inputPlaceholder="Test placeholder"
          @onClose={{this.noop}}
          @addRelatedExternalLink={{this.noop}}
          @addRelatedDocument={{this.noop}}
          @shownDocuments={{this.shownDocuments}}
          @allowAddingExternalLinks={{true}}
          @objectID="test"
          @relatedDocuments={{this.testArray}}
          @relatedLinks={{this.testArray}}
          @search={{this.search}}
        />
      `);

      assert.dom(LIST_HEADER_SELECTOR).hasText("Suggestions");

      // Create a search with results
      await fillIn(SEARCH_INPUT_SELECTOR, "3");
      assert.dom(LIST_HEADER_SELECTOR).hasText("Results");

      // Create a search with no results
      await fillIn(SEARCH_INPUT_SELECTOR, "foobar");
      assert.dom(LIST_HEADER_SELECTOR).doesNotExist();

      // Create an external link
      await fillIn(SEARCH_INPUT_SELECTOR, "https://www.hashicorp.com");
      assert.dom(LIST_HEADER_SELECTOR).doesNotExist();
    });

    test("it renders a loading spinner", async function (this: DocumentSidebarRelatedResourcesAddTestContext, assert) {});

    test("it renders a list as expected", async function (this: DocumentSidebarRelatedResourcesAddTestContext, assert) {});

    test("it renders a 'no matches' message when there are no results", async function (this: DocumentSidebarRelatedResourcesAddTestContext, assert) {});

    test("it conditionally enables keyboard navigation", async function (this: DocumentSidebarRelatedResourcesAddTestContext, assert) {});

    test("it searches for documents", async function (this: DocumentSidebarRelatedResourcesAddTestContext, assert) {});

    test("it can add external links", async function (this: DocumentSidebarRelatedResourcesAddTestContext, assert) {});
  }
);
