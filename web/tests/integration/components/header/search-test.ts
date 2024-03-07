import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { hbs } from "ember-cli-htmlbars";
import {
  click,
  fillIn,
  render,
  triggerKeyEvent,
  focus,
  waitFor,
} from "@ember/test-helpers";
import { setupMirage } from "ember-cli-mirage/test-support";
import { MirageTestContext } from "ember-cli-mirage/test-support";
import { authenticateTestUser } from "hermes/mirage/utils";

const KEYBOARD_SHORTCUT_SELECTOR = ".global-search-shortcut-affordance";
const SEARCH_INPUT_SELECTOR = "[data-test-global-search-input]";
const POPOVER_SELECTOR = ".search-popover";
const SEARCH_POPOVER_LINK_SELECTOR = "[data-test-x-dropdown-list-item-link-to]";

const POPOVER_LOADING_ICON =
  "[data-test-x-dropdown-list-default-loading-block]";

const PROJECT_HITS = "[data-test-project-hits]";
const DOCUMENT_HITS = "[data-test-document-hits]";
const NO_MATCHES = "[data-test-no-matches]";
const VIEW_ALL_RESULTS_LINK = "[data-test-view-all-results-link]";

const PRODUCT_AREA_HIT = "[data-test-product-area-hit]";
const PROJECT_HIT = "[data-test-project-hit]";
const DOCUMENT_HIT = "[data-test-document-hit]";

interface Context extends MirageTestContext {
  query: string;
}

module("Integration | Component | header/search", function (hooks) {
  setupRenderingTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(function (this: Context) {
    authenticateTestUser(this);
    this.server.createList("document", 5);
  });

  test("it renders correctly", async function (this: Context, assert) {
    await render<Context>(hbs`
      <Header::Search class="test-search" />
    `);

    assert.dom(".test-search").exists("renders with the splatted className");

    assert
      .dom(SEARCH_INPUT_SELECTOR)
      .hasAttribute("placeholder", "Search Hermes...");
  });

  test("it conditionally shows a keyboard shortcut icon", async function (this: Context, assert) {
    await render<Context>(hbs`
      <Header::Search />
    `);

    assert
      .dom(KEYBOARD_SHORTCUT_SELECTOR)
      .exists("the keyboard shortcut icon is shown");

    await fillIn(SEARCH_INPUT_SELECTOR, "test");

    assert
      .dom(KEYBOARD_SHORTCUT_SELECTOR)
      .doesNotExist(
        "the keyboard shortcut icon is hidden when the user enters a query",
      );
  });

  test("it conditionally shows a popover", async function (this: Context, assert) {
    await render<Context>(hbs`
      <Header::Search />
      <div class="clickaway-target"></div>
    `);

    assert.dom(POPOVER_SELECTOR).doesNotExist("the popover is hidden");

    await fillIn(SEARCH_INPUT_SELECTOR, "t");

    assert
      .dom(POPOVER_SELECTOR)
      .exists("the popover is shown when a query is entered");

    await click(".clickaway-target");

    assert.dom(POPOVER_SELECTOR).doesNotExist("the popover is hidden");

    await fillIn(SEARCH_INPUT_SELECTOR, "t");

    assert
      .dom(POPOVER_SELECTOR)
      .exists("the popover is shown when a query is entered");
  });

  test("it conditionally shows documents", async function (this: Context, assert) {
    await render<Context>(hbs`
      <Header::Search />
    `);

    await fillIn(SEARCH_INPUT_SELECTOR, "xyz");

    assert.dom(DOCUMENT_HITS).doesNotExist("no documents are shown");

    await fillIn(SEARCH_INPUT_SELECTOR, "vault");

    assert.dom(DOCUMENT_HITS).exists();
    assert.dom(DOCUMENT_HIT).exists({ count: 5 });
    assert.dom(DOCUMENT_HIT).hasAttribute("href", "/document/doc-0");

    assert
      .dom(VIEW_ALL_RESULTS_LINK)
      .exists()
      .hasText(`View all results`)
      .hasAttribute("href", `/results?q=vault`);
  });

  test("it conditionally shows project results", async function (this: Context, assert) {
    this.server.create("project", { title: "Dog house" });
    this.server.create("project", { title: "Cat house" });

    await render<Context>(hbs`
      <Header::Search />
    `);

    await fillIn(SEARCH_INPUT_SELECTOR, "house");

    assert.dom(PROJECT_HITS).exists();
    assert.dom(PROJECT_HIT).exists({ count: 2 });
    assert.dom(PROJECT_HIT).hasAttribute("href", "/projects/0");
  });

  test("the input can be focused with a keyboard shortcut", async function (this: Context, assert) {
    await render<Context>(hbs`
      <Header::Search />
    `);

    assert.dom(SEARCH_INPUT_SELECTOR).isNotFocused();

    await triggerKeyEvent(document, "keydown", "K", { metaKey: true });

    assert.dom(SEARCH_INPUT_SELECTOR).isFocused();
  });

  test("the arrow keys work as expected", async function (this: Context, assert) {
    await render<Context>(hbs`
      <Header::Search />
    `);

    await fillIn(SEARCH_INPUT_SELECTOR, "test document");

    assert.dom(SEARCH_POPOVER_LINK_SELECTOR + "[aria-selected]").doesNotExist();

    await triggerKeyEvent(SEARCH_INPUT_SELECTOR, "keydown", "ArrowDown");

    assert
      .dom(SEARCH_POPOVER_LINK_SELECTOR + "[aria-selected]")
      .containsText("Test Document 0");

    await fillIn(SEARCH_INPUT_SELECTOR, "te");

    assert
      .dom(SEARCH_POPOVER_LINK_SELECTOR + "[aria-selected]")
      .doesNotExist("aria selection is updated when the query changes");

    await triggerKeyEvent(SEARCH_INPUT_SELECTOR, "keydown", "ArrowDown");

    assert
      .dom(SEARCH_POPOVER_LINK_SELECTOR + "[aria-selected]")
      .containsText("Test Document 0");
  });

  test("it conditionally shows a no-matches message", async function (this: Context, assert) {
    await render<Context>(hbs`
      <Header::Search />
    `);

    await fillIn(SEARCH_INPUT_SELECTOR, "xyz");

    assert.dom(NO_MATCHES).exists();
  });

  test("it searches the pre-populated query on focusin", async function (this: Context, assert) {
    const query = "foo";

    this.server.create("document", { title: query });

    this.query = query;

    await render<Context>(hbs`
      <Header::Search @query={{this.query}} />
    `);

    assert.dom(SEARCH_INPUT_SELECTOR).hasValue(query);

    const clickPromise = click(SEARCH_INPUT_SELECTOR);

    await waitFor(POPOVER_LOADING_ICON);

    await clickPromise;

    assert.dom(POPOVER_LOADING_ICON).doesNotExist();
    assert.dom(DOCUMENT_HIT).exists({ count: 1 });
  });

  test("it applies highlights to all title matches", async function (this: Context, assert) {
    const query = "Terra";
    const title = "Terraform";

    this.server.create("project", { title });
    this.server.create("product", { name: title });

    /**
     * Mirage needs the product to be associated with a document,
     * so we create a document with the same title as the product.
     */
    this.server.create("document", { title, product: title });

    await render<Context>(hbs`
      <Header::Search />
    `);

    await fillIn(SEARCH_INPUT_SELECTOR, query);

    assert.dom(PRODUCT_AREA_HIT).exists();
    assert.dom(PRODUCT_AREA_HIT).hasText(title);
    assert.dom(`${PRODUCT_AREA_HIT} mark`).hasText(query);

    assert.dom(DOCUMENT_HIT).exists();
    assert.dom(DOCUMENT_HIT).containsText(title);
    assert.dom(`${DOCUMENT_HIT} mark`).hasText(query);

    assert.dom(PROJECT_HIT).exists();
    assert.dom(PROJECT_HIT).hasText(title);
    assert.dom(`${PROJECT_HIT} mark`).hasText(query);
  });
});
