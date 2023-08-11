import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { hbs } from "ember-cli-htmlbars";
import { click, fillIn, render, triggerKeyEvent } from "@ember/test-helpers";
import { setupMirage } from "ember-cli-mirage/test-support";
import { MirageTestContext } from "ember-cli-mirage/test-support";

const KEYBOARD_SHORTCUT_SELECTOR = ".global-search-shortcut-affordance";
const SEARCH_INPUT_SELECTOR = "[data-test-global-search-input]";
const POPOVER_SELECTOR = ".search-popover";
const BEST_MATCHES_HEADER_SELECTOR = ".global-search-best-matches-header";
const SEARCH_RESULT_SELECTOR = "[data-test-search-result]";
const SEARCH_RESULT_TITLE_SELECTOR = ".global-search-result-title";
const SEARCH_RESULT_OWNER_SELECTOR = "[data-test-search-result-owner]";
const SEARCH_RESULT_SNIPPET_SELECTOR = "[data-test-search-result-snippet]";
const VIEW_ALL_RESULTS_LINK_SELECTOR = ".global-search-popover-header-link";
const PRODUCT_MATCH_LINK_SELECTOR = "[data-test-product-match-link]";
const SEARCH_POPOVER_LINK_SELECTOR = "[data-test-x-dropdown-list-item-link-to]";

interface HeaderSearchTestContext extends MirageTestContext {}

module("Integration | Component | header/search", function (hooks) {
  setupRenderingTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(function (this: HeaderSearchTestContext) {
    this.server.createList("document", 10);
  });

  test("it renders correctly", async function (this: HeaderSearchTestContext, assert) {
    await render<HeaderSearchTestContext>(hbs`
      <Header::Search class="test-search" />
    `);

    assert.dom(".test-search").exists("renders with the splatted className");
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
        "the keyboard shortcut icon is hidden when the user enters a query"
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

  test('it conditionally shows a "best matches" header', async function (this: HeaderSearchTestContext, assert) {
    await render<HeaderSearchTestContext>(hbs`
      <Header::Search />
    `);

    await fillIn(SEARCH_INPUT_SELECTOR, "xyz");

    assert.dom(BEST_MATCHES_HEADER_SELECTOR).doesNotExist();

    await fillIn(SEARCH_INPUT_SELECTOR, "vault");

    assert
      .dom(BEST_MATCHES_HEADER_SELECTOR)
      .exists('the "best matches" header is shown when matches are found');
  });

  test("it renders filterable results in a popover", async function (this: HeaderSearchTestContext, assert) {
    await render<HeaderSearchTestContext>(hbs`
      <Header::Search />
    `);
    await fillIn(SEARCH_INPUT_SELECTOR, "test");

    assert.dom(SEARCH_RESULT_SELECTOR).exists({ count: 5 });

    await fillIn(SEARCH_INPUT_SELECTOR, "3");
    assert
      .dom(SEARCH_RESULT_SELECTOR)
      .exists({ count: 1 })
      .hasAttribute("href", "/document/doc-3");
    assert.dom(SEARCH_RESULT_TITLE_SELECTOR).hasText("Test Document 3");
    assert.dom(SEARCH_RESULT_OWNER_SELECTOR).exists();
    assert.dom(SEARCH_RESULT_SNIPPET_SELECTOR).exists();
  });

  test('a "view all results for..." link is shown', async function (this: HeaderSearchTestContext, assert) {
    await render<HeaderSearchTestContext>(hbs`
      <Header::Search />
    `);

    const query = "hashicorp";

    await fillIn(SEARCH_INPUT_SELECTOR, query);

    assert
      .dom(VIEW_ALL_RESULTS_LINK_SELECTOR)
      .exists()
      .hasText(`View all results for “${query}”`)
      .hasAttribute("href", `/results?q=${query}`);
  });

  test("a bu link is conditionally shown", async function (this: HeaderSearchTestContext, assert) {
    await render<HeaderSearchTestContext>(hbs`
      <Header::Search />
    `);

    await fillIn(SEARCH_INPUT_SELECTOR, "vault");

    assert
      .dom(PRODUCT_MATCH_LINK_SELECTOR)
      .exists()
      .hasText("View all Vault documents")
      .hasAttribute("href", "/all?product=%5B%22Vault%22%5D");
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

    await fillIn(SEARCH_INPUT_SELECTOR, "test");

    assert.dom(SEARCH_POPOVER_LINK_SELECTOR + "[aria-selected]").doesNotExist();

    await triggerKeyEvent(SEARCH_INPUT_SELECTOR, "keydown", "ArrowDown");
    assert
      .dom(SEARCH_POPOVER_LINK_SELECTOR + "[aria-selected]")
      .hasText("View all results for “test”");

    await fillIn(SEARCH_INPUT_SELECTOR, "test 3");

    assert
      .dom(SEARCH_POPOVER_LINK_SELECTOR + "[aria-selected]")
      .doesNotExist("aria selection is updated");

    await triggerKeyEvent(SEARCH_INPUT_SELECTOR, "keydown", "ArrowDown");

    assert
      .dom(SEARCH_POPOVER_LINK_SELECTOR + "[aria-selected]")
      .hasText("View all results for “test 3”");
  });
});
