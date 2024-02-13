import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { click, render, rerender } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import window from "ember-window-mock";
import { RECENTLY_VIEWED_DOCS_SCROLL_AMOUNT } from "hermes/components/dashboard/recently-viewed";
import RecentlyViewedService from "hermes/services/recently-viewed";
import ViewportService from "hermes/services/viewport";

const NO_RECENTLY_VIEWED = "[data-test-no-recently-viewed]";
const ITEM = "[data-test-recently-viewed-item]";
const SCROLL_BACK_BUTTON = "[data-test-scroll-back]";
const SCROLL_FORWARD_BUTTON = "[data-test-scroll-forward]";

interface Context extends MirageTestContext {}

module("Integration | Component | dashboard/recently-viewed", function (hooks) {
  setupRenderingTest(hooks);
  setupMirage(hooks);

  test("if recently viewed is empty, it shows a message", async function (this: Context, assert) {
    await render<Context>(hbs`
        <Dashboard::RecentlyViewed />
      `);

    assert.dom(NO_RECENTLY_VIEWED).exists();
    assert.dom(ITEM).doesNotExist();
  });

  test("it lists recently viewed projects and docs", async function (this: Context, assert) {
    const oldestTitle = "Foo";
    const middleTitle = "Bar";
    const newestTitle = "Baz";

    this.server.create("document", {
      id: "1",
      objectID: "1",
      title: oldestTitle,
    });
    this.server.create("recently-viewed-doc", {
      id: "1",
      isDraft: false,
      status: "In-Review",
      viewedTime: 1, // oldest
    });

    this.server.create("project", { id: "2", title: middleTitle });
    this.server.create("recently-viewed-project", {
      id: "2",
      viewedTime: 2, // middle
    });

    this.server.create("document", {
      id: "3",
      objectID: "3",
      title: newestTitle,
    });
    this.server.create("recently-viewed-doc", {
      id: "3",
      isDraft: true,
      viewedTime: 3, // newest
    });

    const recentlyViewed = this.owner.lookup(
      "service:recently-viewed",
    ) as RecentlyViewedService;

    await recentlyViewed.fetchAll.perform();

    await render<Context>(hbs`
        <Dashboard::RecentlyViewed />
      `);

    assert.dom(ITEM).exists({ count: 3 });

    const allItems = document.querySelectorAll(ITEM);

    const [first, second, third] = allItems;

    assert
      .dom(first)
      .containsText(newestTitle)
      .hasAttribute("href", "/document/3?draft=true");

    assert
      .dom(second)
      .containsText(middleTitle)
      .hasAttribute("href", "/project/2");

    assert
      .dom(third)
      .containsText(oldestTitle)
      .hasAttribute("href", "/document/1");
  });

  test("it scrolls to the right when the forward button is clicked", async function (this: Context, assert) {
    this.server.createList("recently-viewed-doc", 10);
    this.server.createList("document", 10);
    // do these reference each other

    await render<Context>(hbs`
        <Dashboard::RecentlyViewed />
      `);

    // need to look up the scroll container and get its scrollLeft
    // then we need to click the forward button and check that the scrollLeft has changed
    // then we need to click the back button and check that the scrollLeft has changed back

    assert.true(false);
  });
});
