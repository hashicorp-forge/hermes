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
import {
  DOCUMENT_HIT,
  DOCUMENT_HITS,
  KEYBOARD_SHORTCUT,
  NO_MATCHES,
  POPOVER_LOADING_ICON,
  PRODUCT_AREA_HIT,
  PROJECT_HIT,
  PROJECT_HITS,
  SEARCH_INPUT,
  SEARCH_POPOVER,
  SEARCH_POPOVER_LINK,
  VIEW_ALL_RESULTS_LINK,
} from "hermes/tests/helpers/selectors";

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
      .dom(SEARCH_INPUT)
      .hasAttribute("placeholder", "Search Hermes...");
  });

  test("it conditionally shows a keyboard shortcut icon", async function (this: Context, assert) {
    await render<Context>(hbs`
      <Header::Search />
    `);

    assert
      .dom(KEYBOARD_SHORTCUT)
      .exists("the keyboard shortcut icon is shown");

    await fillIn(SEARCH_INPUT, "test");

    assert
      .dom(KEYBOARD_SHORTCUT)
      .doesNotExist(
        "the keyboard shortcut icon is hidden when the user enters a query",
      );
  });

  test("it conditionally shows a popover", async function (this: Context, assert) {
    await render<Context>(hbs`
      <Header::Search />
      <div class="clickaway-target"></div>
    `);

    assert.dom(SEARCH_POPOVER).doesNotExist("the popover is hidden");

    await fillIn(SEARCH_INPUT, "t");

    assert
      .dom(SEARCH_POPOVER)
      .exists("the popover is shown when a query is entered");

    await click(".clickaway-target");

    assert.dom(SEARCH_POPOVER).doesNotExist("the popover is hidden");

    await fillIn(SEARCH_INPUT, "t");

    assert
      .dom(SEARCH_POPOVER)
      .exists("the popover is shown when a query is entered");
  });

  test("it conditionally shows documents", async function (this: Context, assert) {
    await render<Context>(hbs`
      <Header::Search />
    `);

    await fillIn(SEARCH_INPUT, "xyz");

    assert.dom(DOCUMENT_HITS).doesNotExist("no documents are shown");

    await fillIn(SEARCH_INPUT, "vault");

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

    await fillIn(SEARCH_INPUT, "house");

    assert.dom(PROJECT_HITS).exists();
    assert.dom(PROJECT_HIT).exists({ count: 2 });
    assert.dom(PROJECT_HIT).hasAttribute("href", "/projects/0");
  });

  test("the input can be focused with a keyboard shortcut", async function (this: Context, assert) {
    await render<Context>(hbs`
      <Header::Search />
    `);

    assert.dom(SEARCH_INPUT).isNotFocused();

    await triggerKeyEvent(document, "keydown", "K", { metaKey: true });

    assert.dom(SEARCH_INPUT).isFocused();
  });

  test("the arrow keys work as expected", async function (this: Context, assert) {
    await render<Context>(hbs`
      <Header::Search />
    `);

    await fillIn(SEARCH_INPUT, "test document");

    assert.dom(SEARCH_POPOVER_LINK + "[aria-selected]").doesNotExist();

    await triggerKeyEvent(SEARCH_INPUT, "keydown", "ArrowDown");

    assert
      .dom(SEARCH_POPOVER_LINK + "[aria-selected]")
      .containsText("Test Document 0");

    await fillIn(SEARCH_INPUT, "te");

    assert
      .dom(SEARCH_POPOVER_LINK + "[aria-selected]")
      .doesNotExist("aria selection is updated when the query changes");

    await triggerKeyEvent(SEARCH_INPUT, "keydown", "ArrowDown");

    assert
      .dom(SEARCH_POPOVER_LINK + "[aria-selected]")
      .containsText("Test Document 0");
  });

  test("it conditionally shows a no-matches message", async function (this: Context, assert) {
    await render<Context>(hbs`
      <Header::Search />
    `);

    await fillIn(SEARCH_INPUT, "xyz");

    assert.dom(NO_MATCHES).exists();
  });

  test("it searches the pre-populated query on focusin", async function (this: Context, assert) {
    const query = "foo";

    this.server.create("document", { title: query });

    this.query = query;

    await render<Context>(hbs`
      <Header::Search @query={{this.query}} />
    `);

    assert.dom(SEARCH_INPUT).hasValue(query);

    const clickPromise = click(SEARCH_INPUT);

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

    await fillIn(SEARCH_INPUT, query);

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
