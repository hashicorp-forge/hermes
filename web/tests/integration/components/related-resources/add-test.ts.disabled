import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import {
  fillIn,
  render,
  triggerEvent,
  triggerKeyEvent,
} from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { HermesDocument } from "hermes/types/document";
import { XDropdownListAnchorAPI } from "hermes/components/x/dropdown-list";
import { RelatedResourcesScope } from "hermes/components/related-resources";

const MODAL_TITLE_SELECTOR = "[data-test-add-related-resource-modal-title]";
const SEARCH_INPUT_SELECTOR = "[data-test-related-resources-search-input]";
const LIST_HEADER_SELECTOR = "[data-test-related-resources-list-header]";
const LIST_ITEM_SELECTOR = ".x-dropdown-list-item";
const DOCUMENT_OPTION_SELECTOR = ".related-document-option";
const NO_MATCHES_SELECTOR = ".related-resources-modal-body-header";

interface RelatedResourcesAddTestContext extends MirageTestContext {
  noop: () => void;
  search: (dd: XDropdownListAnchorAPI | null, query: string) => Promise<void>;
  getObject: (dd: XDropdownListAnchorAPI | null, id: string) => Promise<void>;
  shownDocuments: Record<string, HermesDocument>;
  searchIsRunning: boolean;
  scope: `${RelatedResourcesScope}`;
}

module("Integration | Component | related-resources/add", function (hooks) {
  setupRenderingTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(function (this: RelatedResourcesAddTestContext) {
    this.server.createList("document", 10);
    this.set("noop", () => {});

    let suggestions = this.server.schema.document.all().models;

    const reducerFunction = (
      acc: Record<string, HermesDocument>,
      document: { attrs: HermesDocument },
    ) => {
      acc[document.attrs.objectID] = document.attrs;
      return acc;
    };

    suggestions = suggestions.reduce(reducerFunction, {});

    const getFirstFourRecords = (documents: any) => {
      return Object.keys(documents)
        .slice(0, 4)
        .reduce(
          (acc, key) => {
            acc[key] = documents[key];
            return acc;
          },
          {} as Record<string, HermesDocument>,
        );
    };

    suggestions = getFirstFourRecords(suggestions);

    this.set("shownDocuments", suggestions);

    this.set(
      "search",
      (
        dd: XDropdownListAnchorAPI | null,
        query: string,
        shouldIgnoreDelay?: boolean,
      ) => {
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
      },
    );

    this.set("getObject", (dd: XDropdownListAnchorAPI | null, id: string) => {
      return Promise.resolve();
    });
  });

  test("it renders correctly (initial load)", async function (this: RelatedResourcesAddTestContext, assert) {
    await render<RelatedResourcesAddTestContext>(hbs`
        <RelatedResources::Add
          @headerTitle="Test title"
          @inputPlaceholder="Test placeholder"
          @addResource={{this.noop}}
          @onClose={{this.noop}}
          @algoliaResults={{this.shownDocuments}}
          @scope="documents"
          @objectID="test"
          @relatedDocuments={{array}}
          @relatedLinks={{array}}
          @search={{this.search}}
          @resetAlgoliaResults={{this.noop}}
          @getObject={{this.getObject}}
        />
      `);

    assert.dom(MODAL_TITLE_SELECTOR).hasText("Test title");
    assert.dom(LIST_HEADER_SELECTOR).hasText("Latest docs");
    assert.dom(DOCUMENT_OPTION_SELECTOR).exists({ count: 4 });
    assert
      .dom(SEARCH_INPUT_SELECTOR)
      .hasAttribute("placeholder", "Test placeholder");
  });

  test("it conditionally renders a list header", async function (this: RelatedResourcesAddTestContext, assert) {
    await render<RelatedResourcesAddTestContext>(hbs`
        <RelatedResources::Add
          @headerTitle="Test title"
          @inputPlaceholder="Test placeholder"
          @onClose={{this.noop}}
          @addResource={{this.noop}}
          @algoliaResults={{this.shownDocuments}}
          @objectID="test"
          @relatedDocuments={{array}}
          @relatedLinks={{array}}
          @search={{this.search}}
          @resetAlgoliaResults={{this.noop}}
          @getObject={{this.getObject}}
        />
      `);

    assert.dom(LIST_HEADER_SELECTOR).hasText("Latest docs");

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

  test("it renders a loading spinner", async function (this: RelatedResourcesAddTestContext, assert) {
    // The `search` task ultimately determines the loading state.
    // Here, we set it to resolve a promise after a timeout to
    // allow us to capture its `isRunning` state.
    this.set("search", () => {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, 1000);
      });
    });

    await render<RelatedResourcesAddTestContext>(hbs`
        <RelatedResources::Add
          @headerTitle="Test title"
          @inputPlaceholder="Test placeholder"
          @onClose={{this.noop}}
          @addResource={{this.noop}}
          @algoliaResults={{this.shownDocuments}}
          @scope="documents"
          @objectID="test"
          @relatedDocuments={{array}}
          @relatedLinks={{array}}
          @search={{this.search}}
          @resetAlgoliaResults={{this.noop}}
          @getObject={{this.getObject}}
        />
      `);
    assert.dom("[data-test-add-related-resource-spinner]").exists();
  });

  test("it renders a 'no matches' message when there are no results", async function (this: RelatedResourcesAddTestContext, assert) {
    await render<RelatedResourcesAddTestContext>(hbs`
        <RelatedResources::Add
          @headerTitle="Test title"
          @inputPlaceholder="Test placeholder"
          @onClose={{this.noop}}
          @addResource={{this.noop}}
          @algoliaResults={{this.shownDocuments}}
          @scope="documents"
          @objectID="test"
          @relatedDocuments={{array}}
          @relatedLinks={{array}}
          @search={{this.search}}
          @resetAlgoliaResults={{this.noop}}
          @getObject={{this.getObject}}
        />
      `);

    await fillIn(SEARCH_INPUT_SELECTOR, "foobar");

    assert
      .dom(NO_MATCHES_SELECTOR)
      .exists('shows "No matches" when there are no results');
  });

  test("it returns query results", async function (this: RelatedResourcesAddTestContext, assert) {
    await render<RelatedResourcesAddTestContext>(hbs`
          <RelatedResources::Add
            @headerTitle="Test title"
            @inputPlaceholder="Test placeholder"
            @onClose={{this.noop}}
            @addResource={{this.noop}}
            @algoliaResults={{this.shownDocuments}}
            @scope="documents"
            @objectID="test"
            @relatedDocuments={{array}}
            @relatedLinks={{array}}
            @search={{this.search}}
            @resetAlgoliaResults={{this.noop}}
            @getObject={{this.getObject}}
          />
        `);

    assert.dom(DOCUMENT_OPTION_SELECTOR).exists({ count: 4 });

    await fillIn(SEARCH_INPUT_SELECTOR, "3");

    assert.dom(DOCUMENT_OPTION_SELECTOR).exists({ count: 1 });
  });

  test("it conditionally enables keyboard navigation", async function (this: RelatedResourcesAddTestContext, assert) {
    await render<RelatedResourcesAddTestContext>(hbs`
          <RelatedResources::Add
            @headerTitle="Test title"
            @inputPlaceholder="Test placeholder"
            @onClose={{this.noop}}
            @addResource={{this.noop}}
            @algoliaResults={{this.shownDocuments}}
            @scope="documents"
            @objectID="test"
            @relatedDocuments={{array}}
            @relatedLinks={{array}}
            @search={{this.search}}
            @resetAlgoliaResults={{this.noop}}
            @getObject={{this.getObject}}
          />
        `);

    assert.dom(DOCUMENT_OPTION_SELECTOR).doesNotHaveAttribute("aria-selected");

    await triggerKeyEvent(SEARCH_INPUT_SELECTOR, "keydown", "ArrowDown");

    // Assert that the first item is selected
    assert.dom(DOCUMENT_OPTION_SELECTOR).hasAttribute("aria-selected");

    // Disable keyboard navigation
    await triggerEvent(SEARCH_INPUT_SELECTOR, "focusout");

    // Try keydown again. Normally this would select the second item.
    await triggerKeyEvent(SEARCH_INPUT_SELECTOR, "keydown", "ArrowDown");

    // Assert that the first item is still selected
    assert.dom(DOCUMENT_OPTION_SELECTOR).hasAttribute("aria-selected");

    // Enable keyboard navigation
    await triggerEvent(SEARCH_INPUT_SELECTOR, "focusin");

    // Try keydown again. This should select the second item.
    await triggerKeyEvent(SEARCH_INPUT_SELECTOR, "keydown", "ArrowDown");

    assert
      .dom(`${LIST_ITEM_SELECTOR}:nth-child(2) ${DOCUMENT_OPTION_SELECTOR}`)
      .hasAttribute("aria-selected");
  });

  test("it shows a loading icon while search is running", async function (this: RelatedResourcesAddTestContext, assert) {
    this.set("searchIsRunning", false);

    await render<RelatedResourcesAddTestContext>(hbs`
        <RelatedResources::Add
          @headerTitle="Test title"
          @inputPlaceholder="Test placeholder"
          @onClose={{this.noop}}
          @addResource={{this.noop}}
          @algoliaResults={{this.shownDocuments}}
          @scope="documents"
          @objectID="test"
          @relatedDocuments={{array}}
          @relatedLinks={{array}}
          @search={{this.search}}
          @searchIsRunning={{this.searchIsRunning}}
          @resetAlgoliaResults={{this.noop}}
          @getObject={{this.getObject}}
        />
      `);
    const iconSelector = "[data-test-related-resources-search-loading-icon]";

    assert.dom(iconSelector).doesNotExist();

    this.set("searchIsRunning", true);

    assert
      .dom("[data-test-related-resources-search-loading-icon]")
      .exists("a loading icon is shown when `searchIsRunning` is true");
  });
});
