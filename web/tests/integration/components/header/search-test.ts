import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { hbs } from "ember-cli-htmlbars";
import { click, fillIn, render, triggerKeyEvent } from "@ember/test-helpers";
import { setupMirage } from "ember-cli-mirage/test-support";
import { MirageTestContext } from "ember-cli-mirage/test-support";
import { authenticateTestUser } from "hermes/mirage/utils";

const KEYBOARD_SHORTCUT_SELECTOR = ".global-search-shortcut-affordance";
const SEARCH_INPUT_SELECTOR = "[data-test-global-search-input]";
const POPOVER_SELECTOR = ".search-popover";
const SEARCH_POPOVER_LINK_SELECTOR = "[data-test-x-dropdown-list-item-link-to]";

const PRODUCT_AREA_HITS = "[data-test-product-area-hits]";
const PROJECT_HITS = "[data-test-project-hits]";
const DOCUMENT_HITS = "[data-test-document-hits]";
const NO_MATCHES = "[data-test-no-matches]";
const VIEW_ALL_DOCS_LINK = "[data-test-view-all-docs-link]";

const PRODUCT_AREA_HIT = "[data-test-product-area-hit]";
const PROJECT_HIT = "[data-test-project-hit]";
const DOCUMENT_HIT = "[data-test-document-hit]";

interface HeaderSearchTestContext extends MirageTestContext {}

module("Integration | Component | header/search", function (hooks) {
  setupRenderingTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(function (this: HeaderSearchTestContext) {
    authenticateTestUser(this);
    this.server.createList("document", 5);
  });

  test("it renders correctly", async function (this: HeaderSearchTestContext, assert) {
    await render<HeaderSearchTestContext>(hbs`
      <Header::Search class="test-search" />
    `);

    assert.dom(".test-search").exists("renders with the splatted className");

    assert
      .dom(SEARCH_INPUT_SELECTOR)
      .hasAttribute("placeholder", "Search Hermes...");
  });

  test("it conditionally shows a keyboard shortcut icon", async function (this: HeaderSearchTestContext, assert) {
    await render<HeaderSearchTestContext>(hbs`
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

  test("it conditionally shows a popover", async function (this: HeaderSearchTestContext, assert) {
    await render<HeaderSearchTestContext>(hbs`
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

  test("it conditionally shows documents", async function (this: HeaderSearchTestContext, assert) {
    await render<HeaderSearchTestContext>(hbs`
      <Header::Search />
    `);

    await fillIn(SEARCH_INPUT_SELECTOR, "xyz");

    assert.dom(DOCUMENT_HITS).doesNotExist("no documents are shown");

    await fillIn(SEARCH_INPUT_SELECTOR, "vault");

    assert.dom(DOCUMENT_HITS).exists();
    assert.dom(DOCUMENT_HIT).exists({ count: 5 });
    assert.dom(DOCUMENT_HIT).hasAttribute("href", "/document/doc-0");

    assert
      .dom(VIEW_ALL_DOCS_LINK)
      .exists()
      .hasText(`View all document results`)
      .hasAttribute("href", `/results?q=vault`);
  });

  test("it conditionally shows project results", async function (this: HeaderSearchTestContext, assert) {
    this.server.create("project", { title: "Dog house" });
    this.server.create("project", { title: "Cat house" });

    await render<HeaderSearchTestContext>(hbs`
      <Header::Search />
    `);

    await fillIn(SEARCH_INPUT_SELECTOR, "house");

    assert.dom(PROJECT_HITS).exists();
    assert.dom(PROJECT_HIT).exists({ count: 2 });
    assert.dom(PROJECT_HIT).hasAttribute("href", "/projects/0");
  });

  test("it conditionally shows a product/area match", async function (this: HeaderSearchTestContext, assert) {
    await render<HeaderSearchTestContext>(hbs`
      <Header::Search />
    `);

    await fillIn(SEARCH_INPUT_SELECTOR, "vault");

    assert.dom(PRODUCT_AREA_HITS).exists();

    assert
      .dom(PRODUCT_AREA_HIT)
      .exists({ count: 1 })
      .hasText("Vault")
      .hasAttribute("href", "/product-areas/vault");
  });

  test("the input can be focused with a keyboard shortcut", async function (this: HeaderSearchTestContext, assert) {
    await render<HeaderSearchTestContext>(hbs`
      <Header::Search />
    `);

    assert.dom(SEARCH_INPUT_SELECTOR).isNotFocused();

    await triggerKeyEvent(document, "keydown", "K", { metaKey: true });

    assert.dom(SEARCH_INPUT_SELECTOR).isFocused();
  });

  test("the arrow keys work as expected", async function (this: HeaderSearchTestContext, assert) {
    await render<HeaderSearchTestContext>(hbs`
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

  test("it conditionally shows a no-matches message", async function (this: HeaderSearchTestContext, assert) {
    await render<HeaderSearchTestContext>(hbs`
      <Header::Search />
    `);

    await fillIn(SEARCH_INPUT_SELECTOR, "xyz");

    assert.dom(NO_MATCHES).exists();
  });
});
