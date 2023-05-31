import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { hbs } from "ember-cli-htmlbars";
import {
  click,
  fillIn,
  render,
  triggerKeyEvent,
  teardownContext,
  triggerEvent,
} from "@ember/test-helpers";
import { setupMirage } from "ember-cli-mirage/test-support";
import { MirageTestContext } from "ember-cli-mirage/test-support";

const KEYBOARD_SHORTCUT_SELECTOR = "[data-test-search-keyboard-shortcut]";
const SEARCH_INPUT_SELECTOR = "[data-test-global-search-input]";
const POPOVER_SELECTOR = ".search-popover";
const BEST_MATCHES_HEADER_SELECTOR = "[data-test-search-best-matches-header]";
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

    /**
     * FIXME: Investigate unresolved promises
     *
     * For reasons not yet clear, this test has unresolved promises
     * that prevent it from completing naturally. Because of this,
     * we handle teardown manually.
     *
     */
    // teardownContext(this);
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

    /**
     * FIXME: Investigate unresolved promises
     *
     * For reasons not yet clear, this test has unresolved promises
     * that prevent it from completing naturally. Because of this,
     * we handle teardown manually.
     *
     */
    // teardownContext(this);
  });

  test('it conditionally shows a "best matches" header', async function (this: HeaderSearchTestContext, assert) {
    // probably need to seed some products

    await render<HeaderSearchTestContext>(hbs`
      <Header::Search />
    `);

    await fillIn(SEARCH_INPUT_SELECTOR, "xyz");

    assert.dom(BEST_MATCHES_HEADER_SELECTOR).doesNotExist();

    await fillIn(SEARCH_INPUT_SELECTOR, "vault");

    assert
      .dom(BEST_MATCHES_HEADER_SELECTOR)
      .exists(
        'the "best matches" header is shown when a product/area is matched'
      );

    /**
     * FIXME: Investigate unresolved promises
     *
     * For reasons not yet clear, this test has unresolved promises
     * that prevent it from completing naturally. Because of this,
     * we handle teardown manually.
     *
     */
    // teardownContext(this);
  });
});
